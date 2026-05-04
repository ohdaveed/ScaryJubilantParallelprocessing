const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const extractText = (payload) => {
  if (!payload || !Array.isArray(payload.content)) return "";
  const textPart = payload.content.find((part) => part?.type === "text" && typeof part.text === "string");
  return textPart?.text || "";
};

const parseJson = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

export const canRunJudge = () => Boolean(process.env.ANTHROPIC_API_KEY);

export async function judgeResponse({ route, input, output }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required for judge mode.");

  const prompt = `Evaluate this HHVC API output quality.
Route: ${route}

Input:
${JSON.stringify(input, null, 2)}

Output:
${typeof output === "string" ? output : JSON.stringify(output, null, 2)}

Return one JSON object:
{
  "accuracy": <1-10 integer>,
  "helpfulness": <1-10 integer>,
  "clarity": <1-10 integer>,
  "overall": <1-10 integer>,
  "reasoning": "<brief explanation>"
}`;

  const upstream = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: "You are a strict evaluator for civic-content API quality. Return only valid JSON.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!upstream.ok) {
    throw new Error(`Judge request failed with status ${upstream.status}`);
  }

  const payload = await upstream.json();
  const rawText = extractText(payload);
  const result = parseJson(rawText);
  if (!result) {
    throw new Error("Judge response did not contain valid JSON.");
  }
  return result;
}
