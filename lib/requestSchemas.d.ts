import type { Request, Response } from "express";
import type { z } from "zod";

export const chatRequestSchema: z.ZodTypeAny;
export const evaluateRequestSchema: z.ZodTypeAny;
export const improveStructureRequestSchema: z.ZodTypeAny;

export function parseRequestBody<T>(
  schema: z.ZodType<T>,
  req: Request,
  res: Response,
  routeName: string
): T | null;
