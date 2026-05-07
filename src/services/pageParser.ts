import { parsePage, parseStructuredPage } from "../utils/parsing";
import { apiFetch } from "../utils/apiFetch";

type ChatTextChunk = { type?: string; text?: string };

type ChatRepairResponse = {
  content?: ChatTextChunk[];
};

export async function repairAndParseStructured(options: {
  text: string;
  systemPrompt: string;
  repairPrompt: string;
  structuredOutputRules: string;
}): Promise<{
  parseResult: ReturnType<typeof parseStructuredPage>;
  parsed: ReturnType<typeof parsePage>;
}> {
  const { text, systemPrompt, repairPrompt, structuredOutputRules } = options;

  let parseResult = parseStructuredPage(text);
  let parsed = parseResult.parsed || parsePage(parseResult.rawText);
  const needsRepair = !!parseResult.parseError || !parsed.valid;

  if (needsRepair) {
    const repairRes = await apiFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        stream: false,
        system: systemPrompt,
        messages: [{ role: "user", content: `${repairPrompt}\n\n${structuredOutputRules}\n\nINVALID RESPONSE:\n${text}` }]
      })
    });

    if (repairRes.ok) {
      const repairBody = await repairRes.json() as ChatRepairResponse;
      const repairedText = repairBody?.content?.find((c) => c.type === "text")?.text || "";
      parseResult = parseStructuredPage(repairedText);
      parsed = parseResult.parsed || parsePage(parseResult.rawText);
    }
  }

  return { parseResult, parsed };
}
