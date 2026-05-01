export type ScreenshotAsset = {
  name: string;
  base64: string;
  mimeType: string;
};

export type ChatImagePayload = {
  base64: string;
  mimeType: string;
};

export type GenerationInputSnapshot = {
  topic: string;
  userType: string;
  notes: string;
};
