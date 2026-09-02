import { generateText, stepCountIs, tool, type ModelMessage, type ToolSet } from "ai";

import { buildSystemPrompt } from "../agent/system-prompt";
import { MAX_STEPS } from "../agent/orchestrator";
import { getAgentModel, getExtractionModel } from "../provider";
import { availableTools } from "../tools/registry";
import { summariseSuite, type CaseResult, type SuiteReport } from "./types";

/**
 * End-to-end scenarios judged by a second model call. Tools are stubbed with
 * canned data (no DB), the agent runs its normal loop, and a Haiku "judge"
 * rates the final reply for helpfulness and tone (1–5 each). A case passes when
 * the average is ≥ 4.
 *
 * `history` seeds a short prior exchange so follow-up asks ("save that",
 * "message the author") have a referent — the realistic shape of a session.
 */
interface Scenario {
  name: string;
  history?: ModelMessage[];
  prompt: string;
  rubric: string;
}

const FOUND_GOA: ModelMessage[] = [
  { role: "user", content: "4 days in Goa, I love seafood and quiet beaches" },
  {
    role: "assistant",
    content:
      "I found “Quiet Goa in 4 days” by @mira (slug quiet-goa-4-days): South Goa beaches, seafood shacks, no nightlife.",
  },
];

const SCENARIOS: Scenario[] = [
  {
    name: "discovery",
    prompt: "I've got 4 days in Goa and I love seafood and quiet beaches. Any ideas?",
    rubric:
      "Should search journeys and give a concise, concrete suggestion grounded in the results, not a generic travel-blog answer. A short reply is good.",
  },
  {
    name: "save-journey",
    history: FOUND_GOA,
    prompt: "Nice — save that one to my list.",
    rubric:
      "The journey to save is clear from the conversation (quiet-goa-4-days). Should call the save tool and confirm in a sentence. No walls of text, no asking which journey.",
  },
  {
    name: "out-of-scope",
    prompt: "What will the weather in Goa be next Tuesday?",
    rubric:
      "The assistant has no weather tool. Should say so plainly and redirect to what it can do, staying friendly.",
  },
  {
    name: "message-author",
    history: FOUND_GOA,
    prompt: "Ask the author whether the monsoon ruins the beaches in June.",
    rubric:
      "The author (@mira) and journey are clear from the conversation. Should draft a short, polite message and surface it for confirmation rather than claiming it was already sent.",
  },
];

const STUB: Record<string, unknown> = {
  searchJourneys: {
    ok: true,
    journeys: [
      {
        slug: "quiet-goa-4-days",
        title: "Quiet Goa in 4 days",
        destination: "Goa",
        durationDays: 4,
        authorHandle: "mira",
        summary: "South Goa beaches, seafood shacks, no nightlife.",
      },
    ],
  },
  getJourney: {
    ok: true,
    journey: {
      slug: "quiet-goa-4-days",
      title: "Quiet Goa in 4 days",
      authorHandle: "mira",
      days: [{ title: "Palolem", items: [{ title: "Seafood at a beach shack" }] }],
    },
  },
  saveJourney: { ok: true, saved: true, slug: "quiet-goa-4-days" },
};

/**
 * Mirrors the real loop (`buildAgentTools`): read tools + `saveJourney` get a
 * canned `execute`; the confirm tools (`createItinerary`, `updateItinerary`,
 * `sendMessage`) get none, so a call to one pauses the loop — the model must
 * describe the pending action rather than report success.
 */
function stubbedToolSet(): ToolSet {
  const set: ToolSet = {};
  for (const t of availableTools()) {
    const base = { description: t.description, inputSchema: t.inputSchema };
    set[t.name] =
      t.kind === "mutate" && t.confirm
        ? tool(base)
        : tool({ ...base, execute: async () => STUB[t.name] ?? { ok: true } });
  }
  return set;
}

const PASS_AVG = 4;

const JUDGE_SYSTEM =
  "You are a strict evaluator of a travel assistant's reply. Judge ONLY against the rubric. " +
  "Respond on exactly three lines and nothing else:\n" +
  "helpfulness: <1-5>\ntone: <1-5>\nwhy: <one sentence>";

/** Pull the two integer scores out of the judge's three-line reply. */
function parseVerdict(text: string): { helpfulness: number; tone: number; why: string } | null {
  const h = text.match(/helpfulness\s*[:=]\s*([1-5])/i);
  const t = text.match(/tone\s*[:=]\s*([1-5])/i);
  if (!h || !t) return null;
  const why = text.match(/why\s*[:=]\s*(.+)/i)?.[1]?.trim() ?? "";
  return { helpfulness: Number(h[1]), tone: Number(t[1]), why };
}

export async function runE2ESuite(): Promise<SuiteReport> {
  const started = Date.now();
  const tools = stubbedToolSet();
  const system = buildSystemPrompt({ summary: null });
  const results: CaseResult[] = [];

  for (const s of SCENARIOS) {
    let reply = "";
    try {
      const { text } = await generateText({
        model: getAgentModel(),
        system,
        messages: [...(s.history ?? []), { role: "user", content: s.prompt }],
        tools,
        stopWhen: stepCountIs(MAX_STEPS),
        temperature: 0,
      });
      reply = text.trim();
    } catch (err) {
      results.push({
        name: s.name,
        passed: false,
        score: 0,
        detail: `agent threw: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    if (!reply) {
      results.push({ name: s.name, passed: false, score: 0, detail: "empty reply" });
      continue;
    }

    try {
      const { text: raw } = await generateText({
        model: getExtractionModel(),
        system: JUDGE_SYSTEM,
        prompt: `RUBRIC: ${s.rubric}\n\nUSER: ${s.prompt}\n\nASSISTANT REPLY:\n${reply}`,
        temperature: 0,
      });
      const verdict = parseVerdict(raw);
      if (!verdict) {
        results.push({
          name: s.name,
          passed: false,
          score: 0,
          detail: `could not parse judge output: ${raw.slice(0, 120)}`,
        });
        continue;
      }
      const avg = (verdict.helpfulness + verdict.tone) / 2;
      results.push({
        name: s.name,
        passed: avg >= PASS_AVG,
        score: avg / 5,
        detail: `helpfulness=${verdict.helpfulness} tone=${verdict.tone} — ${verdict.why}`,
      });
    } catch (err) {
      results.push({
        name: s.name,
        passed: false,
        score: 0,
        detail: `judge threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return summariseSuite("e2e-llm-judge", results, Date.now() - started);
}
