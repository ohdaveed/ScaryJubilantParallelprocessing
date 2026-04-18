export type ScreenshotAsset = {
  name: string;
  base64: string;
  mimeType: string;
};

export type ChatImagePayload = {
  base64: string;
  mimeType: string;
};

export type ImportResult = {
  inserted: number;
  skipped: number;
  skippedPlaceholders: number;
};

export type GenerationInputSnapshot = {
  topic: string;
  userType: string;
  notes: string;
};
