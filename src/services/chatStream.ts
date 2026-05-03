import { ChatImagePayload } from "../state/appTypes";

type StreamMode = "generate" | "refine";

type StreamEvent = {
  type?: string;
  content_block?: { type?: string; name?: string };
  delta?: { type?: string; text?: string };
};

export type StreamModelTextOptions = {
  msg: string;
  mode: StreamMode;
  systemPrompt: string;
  images?: ChatImagePayload[];
  onAdvance: (pct: number, label: string) => void;
  onTextDelta: (deltaText: string) => void;
  onKarlToolUse: (toolName: string) => void;
  hasStreamText: () => boolean;
};

export async function streamModelText(options: StreamModelTextOptions): Promise<{ karlHit: boolean }> {
  const {
    msg,
    mode,
    systemPrompt,
    images,
    onAdvance,
    onTextDelta,
    onKarlToolUse,
    hasStreamText
  } = options;

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: msg }],
      ...(images && images.length > 0 ? { images } : {})
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `HTTP ${res.status}`);
  }

  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let charCount = 0;
  let karlHit = false;

  onAdvance(15, mode === "generate" ? "Querying Karl content standards..." : "Revising page content...");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    for (const line of dec.decode(value).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const d = line.slice(6);
      if (d === "[DONE]") continue;

      try {
        const j = JSON.parse(d) as StreamEvent;
        if (mode === "generate" && j.type === "content_block_start" && j.content_block?.type === "tool_use") {
          karlHit = true;
          onAdvance(30, "Reading Karl docs...");
          onKarlToolUse(j.content_block.name || "tool");
        }
        if (mode === "generate" && j.type === "content_block_stop" && !hasStreamText()) {
          onAdvance(50, "Applying SF.gov standards...");
        }
        if (j.type === "content_block_delta" && j.delta?.type === "text_delta") {
          const deltaText = j.delta.text || "";
          onTextDelta(deltaText);
          charCount += deltaText.length;

          if (mode === "generate") {
            const pct = Math.min(88, 50 + Math.round((charCount / 2200) * 38));
            const lbl = pct < 65
              ? "Drafting page structure..."
              : pct < 75
                ? "Writing page content..."
                : pct < 85
                  ? "Adding compliance checks..."
                  : "Finalizing page...";
            onAdvance(pct, lbl);
          } else {
            const pct = Math.min(88, 15 + Math.round((charCount / 2200) * 73));
            onAdvance(pct, pct < 45 ? "Revising structure..." : pct < 70 ? "Updating content..." : "Finalizing revisions...");
          }
        }
      } catch {
        // Ignore malformed stream lines and continue processing.
      }
    }
  }

  return { karlHit };
}
