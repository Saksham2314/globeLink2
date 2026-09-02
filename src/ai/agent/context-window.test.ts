import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";

import {
  MAX_CONTEXT_MESSAGES,
  messagesToPlainText,
  shouldRefreshSummary,
  windowMessages,
} from "./context-window";

const msg = (role: "user" | "assistant", text: string): UIMessage => ({
  id: Math.random().toString(36).slice(2),
  role,
  parts: [{ type: "text", text }],
});

describe("windowMessages", () => {
  it("returns everything when under the limit", () => {
    const all = [msg("user", "a"), msg("assistant", "b")];
    const { window, overflow } = windowMessages(all);
    expect(window).toHaveLength(2);
    expect(overflow).toHaveLength(0);
  });

  it("keeps the most recent messages and reports the overflow", () => {
    const all = Array.from({ length: MAX_CONTEXT_MESSAGES + 5 }, (_, i) => msg("user", `m${i}`));
    const { window, overflow } = windowMessages(all);
    expect(window).toHaveLength(MAX_CONTEXT_MESSAGES);
    expect(overflow).toHaveLength(5);
    expect((window[0]!.parts[0] as { text: string }).text).toBe("m5");
    expect((overflow.at(-1)!.parts[0] as { text: string }).text).toBe("m4");
  });

  it("respects an explicit max", () => {
    const all = [msg("user", "a"), msg("assistant", "b"), msg("user", "c")];
    expect(windowMessages(all, 1).window).toHaveLength(1);
    expect(windowMessages(all, 1).overflow).toHaveLength(2);
  });
});

describe("shouldRefreshSummary", () => {
  it("triggers only once a session is long", () => {
    expect(shouldRefreshSummary(5)).toBe(false);
    expect(shouldRefreshSummary(30)).toBe(true);
  });
});

describe("messagesToPlainText", () => {
  it("flattens text and notes tool use, dropping empties", () => {
    const messages: UIMessage[] = [
      msg("user", "find me a trip to Goa"),
      {
        id: "x",
        role: "assistant",
        parts: [
          { type: "text", text: "Looking now" },
          {
            type: "tool-searchJourneys",
            toolCallId: "1",
            state: "output-available",
            input: {},
            output: { ok: true, data: {} },
          } as never,
        ],
      },
      msg("assistant", ""),
    ];
    const text = messagesToPlainText(messages);
    expect(text).toContain("USER: find me a trip to Goa");
    expect(text).toContain("ASSISTANT: Looking now [used a tool]");
    expect(text.split("\n")).toHaveLength(2);
  });
});
