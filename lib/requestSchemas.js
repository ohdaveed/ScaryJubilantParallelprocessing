import { z } from "zod";

const nonEmptyString = z.string().refine((value) => value.trim().length > 0, {
  message: "Expected a non-empty string"
});

const chatContentTextBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string()
}).passthrough();

const chatContentImageBlockSchema = z.object({
  type: z.literal("image"),
  source: z.object({
    type: z.string(),
    media_type: z.string(),
    data: z.string()
  }).passthrough()
}).passthrough();

const chatContentBlockSchema = z.union([
  chatContentTextBlockSchema,
  chatContentImageBlockSchema
]);

const chatMessageSchema = z.object({
  role: nonEmptyString,
  content: z.union([
    z.string(),
    z.array(chatContentBlockSchema)
  ])
}).passthrough();

const imageAttachmentSchema = z.object({
  base64: nonEmptyString,
  mimeType: nonEmptyString
}).passthrough();

const evaluationFeedbackSchema = z.object({
  score: z.number().optional(),
  grade: z.string().optional(),
  summary: z.string().optional(),
  passed: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  failed: z.array(z.string()).optional(),
  parseError: z.boolean().optional(),
  parseFailureReason: z.string().nullable().optional(),
  confidence: z.string().optional()
}).passthrough();

export const chatRequestSchema = z.object({
  model: nonEmptyString,
  messages: z.array(chatMessageSchema),
  driveContext: z.string().optional(),
  images: z.array(imageAttachmentSchema).optional()
}).passthrough();

export const evaluateRequestSchema = z.object({
  pageName: z.string().optional(),
  pageType: z.string().optional(),
  userType: z.string().optional(),
  draft: nonEmptyString
}).passthrough();

export const improveStructureRequestSchema = z.object({
  raw: nonEmptyString,
  preferences: z.array(z.string()).optional(),
  evaluationFeedback: evaluationFeedbackSchema.optional()
}).passthrough();

const numericIdString = z.string().refine((value) => /^[0-9]+$/.test(value.trim()), {
  message: "Expected a numeric id string"
});

export const promoteArtifactRequestSchema = z.object({
  conceptId: z.union([z.number(), numericIdString])
}).passthrough();

export const parseRequestBody = (schema, req, res, routeName) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: `Invalid request body for ${routeName}` });
    return null;
  }

  return parsed.data;
};
