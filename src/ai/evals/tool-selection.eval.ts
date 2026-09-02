import { generateText, stepCountIs, tool, type ToolSet } from "ai";

import { buildSystemPrompt } from "../agent/system-prompt";
import { getAgentModel } from "../provider";
import { availableTools } from "../tools/registry";
import { summariseSuite, type CaseResult, type SuiteReport } from "./types";

/**
 * Prompt → the tool we expect the agent to reach for. Services are NOT called:
 * every tool gets a canned `execute` stub so the loop can take a few steps and
 * we can read which tool it chose. A case passes if the expected tool appears in
 * the calls made within the first three steps (some tools need a lookup first).
 */
interface ToolCase {
  prompt: string;
  expectTool: string;
}

const CASES: ToolCase[] = [
  { prompt: "find me cheap beach trips around Goa", expectTool: "searchJourneys" },
  {
    prompt: "what's the day-by-day plan for the '5 days in Goa' journey?",
    expectTool: "getJourney",
  },
  {
    prompt: "save the journey with slug 5-days-in-goa to my saved list",
    expectTool: "saveJourney",
  },
  {
    prompt: "turn the Goa journey into a personal itinerary I can edit",
    expectTool: "createItinerary",
  },
  { prompt: "rename my 'Tokyo' itinerary to 'Tokyo in spring'", expectTool: "updateItinerary" },
  {
    prompt: "message the author of the Goa journey and ask if May is too hot",
    expectTool: "sendMessage",
  },
];

const STUB_RESULT: Record<string, unknown> = {
  searchJourneys: {
    ok: true,
    journeys: [
      { slug: "5-days-in-goa", title: "5 days in Goa", destination: "Goa", authorHandle: "mira" },
    ],
  },
  getJourney: {
    ok: true,
    journey: { slug: "5-days-in-goa", title: "5 days in Goa", days: [], authorHandle: "mira" },
  },
  saveJourney: { ok: true, saved: true, slug: "5-days-in-goa" },
  createItinerary: { ok: true, itineraryId: "itin_stub", title: "5 days in Goa" },
  updateItinerary: { ok: true, itineraryId: "itin_stub" },
  sendMessage: { ok: true, sent: true },
};

function stubbedToolSet(): ToolSet {
  const set: ToolSet = {};
  for (const t of availableTools()) {
    set[t.name] = tool({
      description: t.description,
      inputSchema: t.inputSchema,
      execute: async () => STUB_RESULT[t.name] ?? { ok: true },
    });
  }
  return set;
}

export async function runToolSelectionSuite(): Promise<SuiteReport> {
  const started = Date.now();
  const tools = stubbedToolSet();
  const system = buildSystemPrompt({ summary: null });
  const results: CaseResult[] = [];

  for (const c of CASES) {
    let called: string[] = [];
    try {
      const { steps } = await generateText({
        model: getAgentModel(),
        system,
        prompt: c.prompt,
        tools,
        stopWhen: stepCountIs(3),
        temperature: 0,
      });
      called = steps.flatMap((s) => s.toolCalls?.map((tc) => tc.toolName) ?? []);
    } catch (err) {
      results.push({
        name: c.prompt,
        passed: false,
        score: 0,
        detail: `generateText threw: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    const hit = called.includes(c.expectTool);
    results.push({
      name: c.prompt,
      passed: hit,
      score: hit ? 1 : 0,
      detail: `expected ${c.expectTool}; called [${called.join(", ") || "none"}]`,
    });
  }

  return summariseSuite("tool-selection", results, Date.now() - started);
}
