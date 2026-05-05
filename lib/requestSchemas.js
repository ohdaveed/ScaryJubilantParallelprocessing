import { z } from "zod";

const nonEmptyTrimmedString = z.string().trim().min(1);
const objectLikeSchema = z.object({}).passthrough();

const imageSchema = z.object({
  base64: z.string(),
  mimeType: z.string()
});

export const chatRequestSchema = z.object({
  model: z.string().trim().min(1),
  messages: z.array(z.unknown()),
  driveContext: z.string().optional(),
  images: z.array(imageSchema).optional()
}).passthrough();

export const evaluateRequestSchema = z.object({
  pageName: z.string().optional(),
  pageType: z.string().optional(),
  userType: z.string().optional(),
  draft: nonEmptyTrimmedString
}).passthrough();

export const improveStructureRequestSchema = z.object({
  raw: nonEmptyTrimmedString,
  preferences: z.array(z.string()).optional(),
  evaluationFeedback: objectLikeSchema.optional()
}).passthrough();

export const parseRequestBody = (schema, req, res, routeName) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: `Invalid request body for ${routeName}` });
    return null;
  }

  return parsed.data;
};
