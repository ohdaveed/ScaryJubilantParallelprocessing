/**
 * Local Google Drive access via googleapis (replaces @replit/connectors-sdk).
 *
 * Configure one of:
 * - Service account: set GOOGLE_APPLICATION_CREDENTIALS to the path of the
 *   service account JSON key, and share the target Drive folder with that
 *   account's email. Optionally use GOOGLE_SERVICE_ACCOUNT_JSON instead with
 *   the raw JSON string (e.g. in hosted envs).
 * - OAuth2 (Desktop client): set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
 *   and GOOGLE_OAUTH_REFRESH_TOKEN (from a one-time OAuth consent flow using
 *   credentials.json from Google Cloud Console). Optional GOOGLE_OAUTH_REDIRECT_URI
 *   if it must match the client (default http://localhost).
 *
 * Enable "Google Drive API" on your GCP project.
 */
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

let driveSingleton = null;

function buildAuth() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS.trim(),
      scopes: SCOPES
    });
  }
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    let credentials;
    try {
      credentials = JSON.parse(inline);
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
    return new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES
    });
  }
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const refresh = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
  if (id && secret && refresh) {
    const redirect =
      process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || "http://localhost";
    const oauth2 = new google.auth.OAuth2(id, secret, redirect);
    oauth2.setCredentials({ refresh_token: refresh });
    return oauth2;
  }
  throw new Error(
    "Google Drive is not configured. Set GOOGLE_APPLICATION_CREDENTIALS (service account JSON path), " +
      "or GOOGLE_SERVICE_ACCOUNT_JSON, or GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET + GOOGLE_OAUTH_REFRESH_TOKEN."
  );
}

/** @returns {Promise<import("googleapis").drive_v3.Drive>} */
export async function getDrive() {
  if (driveSingleton) return driveSingleton;
  const auth = buildAuth();
  const client = typeof auth.getClient === "function" ? await auth.getClient() : auth;
  driveSingleton = google.drive({ version: "v3", auth: client });
  return driveSingleton;
}

/** @param {import("googleapis").drive_v3.Drive} drive */
export async function listFilesInFolder(drive, folderId) {
  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,modifiedTime)",
    pageSize: 50,
    orderBy: "name"
  });
  return data.files || [];
}

/** @param {import("googleapis").drive_v3.Drive} drive */
export async function getFileMetadata(drive, fileId) {
  const { data } = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,parents"
  });
  return data;
}

/** @param {import("googleapis").drive_v3.Drive} drive */
export async function exportGoogleFile(drive, fileId, mimeType) {
  const res = await drive.files.export({ fileId, mimeType }, { responseType: "text" });
  return typeof res.data === "string" ? res.data : String(res.data ?? "");
}

/** @param {import("googleapis").drive_v3.Drive} drive */
export async function downloadFileMedia(drive, fileId) {
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  return Buffer.from(res.data);
}

/** HTTP status from googleapis / Gaxios errors, or undefined */
export function httpStatusFromDriveError(err) {
  const n = err?.response?.status ?? err?.code;
  return typeof n === "number" && n >= 400 && n < 600 ? n : undefined;
}
