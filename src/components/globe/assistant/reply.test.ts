import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";

import { composeWithReply, messagePlainText, quotableText, splitReply } from "./reply";

describe("composeWithReply / splitReply", () => {
  it("round-trips a quoted reply", () => {
    const composed = composeWithReply("Is it doable in 3 days?", {
      role: "assistant",
      text: "I found the Manali Trip journey, 5 days, ₹15,000.",
    });
    const { quote, text } = splitReply(composed);
    expect(quote).toEqual({
      role: "assistant",
      text: "I found the Manali Trip journey, 5 days, ₹15,000.",
    });
    expect(text).toBe("Is it doable in 3 days?");
  });

  it("returns the text unchanged when there is no reply", () => {
    expect(composeWithReply("plain question", null)).toBe("plain question");
    expect(splitReply("plain question")).toEqual({ quote: null, text: "plain question" });
  });

  it("collapses whitespace and caps the quote length", () => {
    const long = "word ".repeat(100);
    const composed = composeWithReply("ok", { role: "user", text: long });
    const { quote } = splitReply(composed);
    expect(quote!.text.length).toBeLessThanOrEqual(240);
    expect(quote!.text).not.toContain("\n");
  });

  it("ignores an empty quote", () => {
    expect(composeWithReply("hi", { role: "user", text: "   " })).toBe("hi");
  });
});

describe("messagePlainText / quotableText", () => {
  const msg = (parts: UIMessage["parts"]): UIMessage => ({ id: "m", role: "assistant", parts });

  it("joins text parts and skips tool parts", () => {
    const m = msg([
      { type: "text", text: "Two journeys" },
      { type: "tool-searchJourneys", toolCallId: "1", state: "output-available" } as never,
      { type: "text", text: "match." },
    ]);
    expect(messagePlainText(m)).toBe("Two journeys match.");
  });

  it("quotableText strips a reply marker so replies don't nest", () => {
    const replied: UIMessage = {
      id: "u",
      role: "user",
      parts: [
        {
          type: "text",
          text: composeWithReply("and cheaper?", { role: "assistant", text: "Found it." }),
        },
      ],
    };
    expect(quotableText(replied)).toBe("and cheaper?");
  });
});
