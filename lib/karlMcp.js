import { readFile } from "fs/promises";
import os from "os";
import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const KARL_MCP_SERVER_NAME = "sf-gov-and-karl-editor-help-center";
const DEFAULT_MAX_GUIDANCE = 6;
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "if",
  "in", "into", "is", "it", "of", "on", "or", "that", "the", "their", "then",
  "these", "this", "to", "use", "with", "your"
]);

const getErrorMessage = (error) => error instanceof Error ? error.message : String(error);

const uniq = (items) => [...new Set(items)];

const decodeEntities = (text) => text
  .replace(/&#x20;/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const stripMarkdown = (text) => decodeEntities(text)
  .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/^\s{0,3}#{1,6}\s+/gm, "")
  .replace(/^\s*[-*]\s+/gm, "")
  .replace(/^\s*\d+\.\s+/gm, "")
  .replace(/\*\*(.*?)\*\*/g, "$1")
  .replace(/\*(.*?)\*/g, "$1")
  .replace(/`+/g, "")
  .replace(/\s+/g, " ")
  .trim();

const getDefaultMcpConfigPaths = () => {
  const userHome = os.homedir();
  const paths = [
    process.env.KARL_MCP_CONFIG_PATH,
    path.join(process.cwd(), ".vscode", "mcp.json"),
    process.env.APPDATA ? path.join(process.env.APPDATA, "Code", "User", "mcp.json") : null,
    path.join(userHome, "AppData", "Roaming", "Code", "User", "mcp.json"),
  ];
  return uniq(paths.filter(Boolean));
};

export async function resolveKarlMcpConfig() {
  if (process.env.KARL_MCP_URL?.trim()) {
    return {
      serverName: process.env.KARL_MCP_SERVER_NAME || KARL_MCP_SERVER_NAME,
      url: process.env.KARL_MCP_URL.trim(),
      authorizationToken: process.env.KARL_MCP_AUTHORIZATION_TOKEN || process.env.KARL_MCP_AUTH_TOKEN || undefined,
      source: "env"
    };
  }

  let lastError = null;
  for (const configPath of getDefaultMcpConfigPaths()) {
    try {
      const raw = await readFile(configPath, "utf8");
      const parsed = JSON.parse(raw);
      const server = parsed?.servers?.[KARL_MCP_SERVER_NAME];
      if (server?.url) {
        return {
          serverName: KARL_MCP_SERVER_NAME,
          url: server.url,
          authorizationToken: server.authorization_token || server.authorizationToken || undefined,
          source: configPath
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw new Error(`Unable to load Karl MCP configuration: ${getErrorMessage(lastError)}`);
  }
  throw new Error(`Missing Karl MCP server configuration for ${KARL_MCP_SERVER_NAME}`);
}

export async function createKarlMcpClient({ url }) {
  const client = new Client({ name: "hhvc-tool", version: "1.0.0" });
  let transport = null;

  return {
    client,
    get transport() {
      return transport;
    },
    async connect() {
      const target = new URL(url);
      try {
        transport = new StreamableHTTPClientTransport(target);
        await client.connect(transport);
      } catch (streamableError) {
        transport = new SSEClientTransport(target);
        await client.connect(transport);
      }
    }
  };
}

const pickTool = (tools, preferredName, requiredArgs = []) => {
  const exact = tools.find((tool) => tool?.name === preferredName);
  if (exact) return exact;

  return tools.find((tool) => {
    const properties = Object.keys(tool?.inputSchema?.properties || {});
    return requiredArgs.every((arg) => properties.includes(arg));
  });
};

export const buildKarlSearchQuery = ({ failures, pageType, draft }) => {
  const failureText = Array.isArray(failures) ? failures.filter(Boolean).join(" ") : "";
  const draftExcerpt = typeof draft === "string" ? draft.slice(0, 400) : "";
  return [
    pageType ? `${pageType} page guidance` : "",
    failureText,
    draftExcerpt
  ].filter(Boolean).join("\n\n");
};

const extractLinks = (text) => uniq((text.match(/https?:\/\/\S+/g) || []).map((url) => url.replace(/[),.]+$/g, "")));

const parseSearchHit = (text) => {
  const match = text.match(/^Title:\s*(.+?)\nLink:\s*(https?:\/\/\S+)\nContent:\s*([\s\S]*)$/i);
  if (!match) return null;
  return {
    title: stripMarkdown(match[1]),
    link: match[2].trim(),
    content: match[3].trim()
  };
};

const extractKeywords = ({ failures, pageType }) => {
  const tokens = `${pageType || ""} ${(failures || []).join(" ")}`
    .toLowerCase()
    .match(/[a-z][a-z-]{2,}/g) || [];

  return uniq(tokens.filter((token) => !STOP_WORDS.has(token)));
};

const lineScore = (line, keywords) => {
  const lower = line.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (lower.includes(keyword)) score += 3;
  }
  if (/\b(must|cannot|only|required|use|include|hard-coded)\b/.test(lower)) score += 2;
  if (line.length >= 40 && line.length <= 220) score += 1;
  return score;
};

const extractUsefulLines = (text, keywords) => {
  const cleaned = decodeEntities(text)
    .replace(/<figure[\s\S]*?<\/figure>/gi, "\n")
    .replace(/<[^>]+>/g, "\n");

  const candidates = cleaned
    .split(/\n+/)
    .map((line) => stripMarkdown(line))
    .filter((line) => line.length >= 24)
    .filter((line) => !/^title:\s/i.test(line))
    .filter((line) => !/^link:\s/i.test(line))
    .filter((line) => !/^content:\s*/i.test(line));

  return uniq(candidates)
    .map((line) => ({ line, score: lineScore(line, keywords) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.line);
};

const buildGuidanceFromHits = ({ hits, pageBodies, keywords, maxGuidance = DEFAULT_MAX_GUIDANCE }) => {
  const guidance = [];

  for (const hit of hits) {
    const lines = extractUsefulLines(hit.content, keywords).slice(0, 2);
    for (const line of lines) {
      guidance.push(`[${hit.title}] ${line} (${hit.link})`);
    }
  }

  for (const page of pageBodies) {
    const lines = extractUsefulLines(page.text, keywords).slice(0, 1);
    for (const line of lines) {
      guidance.push(`[${page.title}] ${line} (${page.link})`);
    }
  }

  return uniq(guidance).slice(0, maxGuidance);
};

export const extractGuidanceLines = (toolResult, context = {}) => {
  const content = Array.isArray(toolResult?.content) ? toolResult.content : [];
  const textBlocks = content
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => item.text.trim())
    .filter(Boolean);

  const hits = textBlocks.map(parseSearchHit).filter(Boolean);
  if (hits.length === 0) {
    return uniq(
      textBlocks.flatMap((text) => extractUsefulLines(text, extractKeywords(context)))
    ).slice(0, DEFAULT_MAX_GUIDANCE);
  }

  return buildGuidanceFromHits({
    hits,
    pageBodies: [],
    keywords: extractKeywords(context)
  });
};

const closeKarlClient = async (connection) => {
  if (!connection) return;
  try {
    if (typeof connection.transport?.terminateSession === "function") {
      await connection.transport.terminateSession();
    }
  } catch {
    // Ignore explicit session termination failures.
  }

  try {
    if (typeof connection.client?.close === "function") {
      await connection.client.close();
    }
  } catch {
    // Ignore client close failures during cleanup.
  }
};

export async function fetchKarlGuidance({ failures, pageType, draft }, deps = {}) {
  const resolveConfig = deps.resolveConfig || resolveKarlMcpConfig;
  const createClient = deps.createClient || createKarlMcpClient;
  let connection = null;

  try {
    const config = await resolveConfig();
    connection = await createClient(config);
    if (typeof connection.connect === "function") {
      await connection.connect();
    }

    const toolsResult = await connection.client.listTools();
    const tools = Array.isArray(toolsResult?.tools) ? toolsResult.tools : [];
    const searchTool = pickTool(tools, "searchDocumentation", ["query"]);
    if (!searchTool) {
      throw new Error("Karl MCP searchDocumentation tool is unavailable");
    }

    const getPageTool = pickTool(tools, "getPage", ["url"]);
    const query = buildKarlSearchQuery({ failures, pageType, draft });
    const searchResult = await connection.client.callTool({
      name: searchTool.name,
      arguments: { query }
    });

    const keywords = extractKeywords({ failures, pageType });
    const initialGuidance = extractGuidanceLines(searchResult, { failures, pageType });
    const searchTexts = Array.isArray(searchResult?.content)
      ? searchResult.content.filter((item) => item?.type === "text" && typeof item.text === "string").map((item) => item.text)
      : [];
    const hits = searchTexts.map(parseSearchHit).filter(Boolean);

    const pageBodies = [];
    if (getPageTool) {
      const links = uniq(hits.flatMap((hit) => hit?.link ? [hit.link] : extractLinks(hit?.content || ""))).slice(0, 2);
      for (const link of links) {
        try {
          const pageResult = await connection.client.callTool({
            name: getPageTool.name,
            arguments: { url: link }
          });
          const pageText = pageResult?.content?.find((item) => item?.type === "text" && typeof item.text === "string")?.text;
          if (pageText) {
            const hit = hits.find((entry) => entry.link === link);
            pageBodies.push({
              title: hit?.title || link,
              link,
              text: pageText
            });
          }
        } catch {
          // Search excerpts are still usable if a page lookup fails.
        }
      }
    }

    const enrichedGuidance = hits.length > 0
      ? buildGuidanceFromHits({ hits, pageBodies, keywords })
      : initialGuidance;

    return {
      consulted: true,
      guidance: enrichedGuidance.length > 0 ? enrichedGuidance : initialGuidance,
      error: null
    };
  } catch (error) {
    return {
      consulted: false,
      guidance: [],
      error: getErrorMessage(error)
    };
  } finally {
    await closeKarlClient(connection);
  }
}
