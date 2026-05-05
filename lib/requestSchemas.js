import { z } from "zod";

const nonEmptyString = z.string().refine((value) => value.trim().length > 0, {
  message: "Expected a non-empty string"
});
const objectLikeSchema = z.object({}).passthrough();

export const chatRequestSchema = z.object({
  model: nonEmptyString,
  messages: z.array(z.unknown()),
  driveContext: z.string().optional(),
  images: z.array(z.unknown()).optional()
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
