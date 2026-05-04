const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

export const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

export const extractModelText = (payload) => {
  if (!isObject(payload) || !Array.isArray(payload.content)) return "";
  const textPart = payload.content.find((part) => part?.type === "text" && typeof part.text === "string");
  return textPart?.text || "";
};

export const extractJsonObjectFromText = (text) => {
  if (!isNonEmptyString(text)) return null;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
};

export const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean);
};

export const normalizeEvaluationPayload = (raw) => {
  if (!isObject(raw)) return null;
  const grade = typeof raw.grade === "string" ? raw.grade.trim().toUpperCase() : "";
  const allowedGrades = new Set(["A", "B", "C", "D", "F"]);
  const parsedScore = Number(raw.score);
  const score = Number.isFinite(parsedScore) ? Math.max(0, Math.min(100, Math.round(parsedScore))) : 0;
  const summary = typeof raw.summary === "string" && raw.summary.trim()
    ? raw.summary.trim()
    : "No evaluator summary provided.";

  return {
    score,
    grade: allowedGrades.has(grade) ? grade : "F",
    summary,
    passed: normalizeStringArray(raw.passed),
    warnings: normalizeStringArray(raw.warnings),
    failed: normalizeStringArray(raw.failed),
    parseError: false,
    parseFailureReason: null,
    confidence: "medium"
  };
};

export const hasRequiredDraftShape = (text) => {
  if (!isNonEmptyString(text)) return false;
  const requiredHeadings = ["PAGE NAME:", "PAGE TYPE:", "PRIMARY USER:"];
  return requiredHeadings.every((heading) => text.includes(heading));
};
