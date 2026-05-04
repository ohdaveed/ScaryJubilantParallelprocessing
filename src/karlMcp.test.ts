import { describe, expect, it, vi } from "vitest";
import { fetchKarlGuidance } from "../lib/karlMcp.js";

describe("fetchKarlGuidance", () => {
  it("consults the configured Karl MCP client and returns extracted guidance", async () => {
    const listTools = vi.fn().mockResolvedValue({
      tools: [
        {
          name: "searchDocumentation",
          description: "Search help-center content",
          inputSchema: {
            properties: {
              query: { type: "string" }
            }
          }
        }
      ]
    });
    const callTool = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: [
            "Use the Transaction page type for service actions.",
            "Include What to know and What to do for Transaction pages."
          ].join("\n")
        }
      ]
    });
    const close = vi.fn().mockResolvedValue(undefined);
    const terminateSession = vi.fn().mockResolvedValue(undefined);
    const connect = vi.fn().mockResolvedValue(undefined);

    const result = await fetchKarlGuidance(
      {
        failures: [
          "Use a valid Karl page type.",
          "Add What to do and What to know sections."
        ],
        pageType: "Transaction",
        draft: "Draft content"
      },
      {
        resolveConfig: async () => ({
          serverName: "sf-gov-and-karl-editor-help-center",
          url: "https://example.com/mcp"
        }),
        createClient: async () => ({
          client: { listTools, callTool, close },
          transport: { terminateSession },
          connect
        })
      }
    );

    expect(connect).toHaveBeenCalledOnce();
    expect(listTools).toHaveBeenCalledOnce();
    expect(callTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "searchDocumentation",
        arguments: expect.objectContaining({
          query: expect.stringContaining("Transaction")
        })
      })
    );
    expect(result.consulted).toBe(true);
    expect(result.error).toBeNull();
    expect(result.guidance).toHaveLength(2);
    expect(result.guidance).toEqual(expect.arrayContaining([
      "Use the Transaction page type for service actions.",
      "Include What to know and What to do for Transaction pages."
    ]));
    expect(terminateSession).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("returns a clean fallback when Karl MCP is unavailable", async () => {
    const result = await fetchKarlGuidance(
      {
        failures: ["Use a valid Karl page type."],
        pageType: "Information",
        draft: "Draft content"
      },
      {
        resolveConfig: async () => {
          throw new Error("Missing Karl MCP server configuration");
        }
      }
    );

    expect(result).toEqual({
      consulted: false,
      guidance: [],
      error: "Missing Karl MCP server configuration"
    });
  });
});
