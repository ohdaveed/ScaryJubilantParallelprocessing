import { describe, it, expect, vi, beforeEach } from "vitest";
import { repairAndParseStructured } from "./pageParser";
import * as parsing from "../utils/parsing";
import type { ParseErrorDetail } from "../types";

global.fetch = vi.fn();

describe("repairAndParseStructured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockValidPage = {
    valid: true,
    name: "Test Page",
    pageType: "Information",
    draft: "# Test\n\nContent here."
  };

  const mockStructuredOutput = {
    rawText: JSON.stringify({
      page: {
        name: "Test Page",
        pageType: "Information",
        pageDraft: "# Test\n\nContent here."
      }
    }),
    parseError: null,
    parsed: mockValidPage
  };

  it("should return parsed page without repair if valid", async () => {
    vi.spyOn(utils, "parseStructuredPage").mockReturnValue({
      rawText: mockStructuredOutput.rawText,
      parseError: null,
      parsed: mockValidPage as any
    });

    vi.spyOn(utils, "parsePage").mockReturnValue(mockValidPage as any);

    const result = await repairAndParseStructured({
      text: mockStructuredOutput.rawText,
      systemPrompt: "System",
      repairPrompt: "Repair",
      structuredOutputRules: "Rules"
    });

    expect(result.parsed).toEqual(mockValidPage);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should attempt repair when parse fails", async () => {
    const parseError: ParseErrorDetail = { code: "invalid_json", message: "Invalid JSON" };

    vi.spyOn(utils, "parseStructuredPage")
      .mockReturnValueOnce({
        rawText: "invalid",
        parseError,
        parsed: null
      })
      .mockReturnValueOnce({
        rawText: mockStructuredOutput.rawText,
        parseError: null,
        parsed: mockValidPage as any
      });

    vi.spyOn(utils, "parsePage").mockReturnValue(mockValidPage as any);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: mockStructuredOutput.rawText }]
      })
    });

    const result = await repairAndParseStructured({
      text: "invalid",
      systemPrompt: "System",
      repairPrompt: "Repair",
      structuredOutputRules: "Rules"
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(result.parseResult.parseError).toBeNull();
  });

  it("should send repair prompt with original invalid response", async () => {
    const parseError: ParseErrorDetail = { code: "schema_invalid", message: "Schema mismatch" };

    vi.spyOn(utils, "parseStructuredPage")
      .mockReturnValueOnce({
        rawText: "invalid",
        parseError,
        parsed: null
      })
      .mockReturnValueOnce({
        rawText: mockStructuredOutput.rawText,
        parseError: null,
        parsed: mockValidPage as any
      });

    vi.spyOn(utils, "parsePage").mockReturnValue(mockValidPage as any);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: mockStructuredOutput.rawText }]
      })
    });

    const originalInvalid = "invalid content";
    const repairPrompt = "Please fix this";
    const structuredRules = "Must follow schema X";

    await repairAndParseStructured({
      text: originalInvalid,
      systemPrompt: "System",
      repairPrompt: repairPrompt,
      structuredOutputRules: structuredRules
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    const userMessage = body.messages[0].content;

    expect(userMessage).toContain(repairPrompt);
    expect(userMessage).toContain(structuredRules);
    expect(userMessage).toContain(originalInvalid);
  });

  it("should handle repair API errors gracefully", async () => {
    const parseError: ParseErrorDetail = { code: "invalid_json", message: "Invalid JSON" };

    vi.spyOn(utils, "parseStructuredPage")
      .mockReturnValueOnce({
        rawText: "invalid",
        parseError,
        parsed: null
      })
      .mockReturnValueOnce({
        rawText: "invalid",
        parseError,
        parsed: null
      });

    vi.spyOn(utils, "parsePage").mockReturnValue({
      valid: false,
      name: "Unknown"
    } as any);

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500
    });

    const result = await repairAndParseStructured({
      text: "invalid",
      systemPrompt: "System",
      repairPrompt: "Repair",
      structuredOutputRules: "Rules"
    });

    // Should return fallback parsed result
    expect(result.parsed).toBeDefined();
    expect(result.parsed?.valid).toBe(false);
  });

  it("should extract text_delta from repair response content blocks", async () => {
    const parseError: ParseErrorDetail = { code: "invalid_json", message: "Invalid" };
    const repairedText = mockStructuredOutput.rawText;

    vi.spyOn(utils, "parseStructuredPage")
      .mockReturnValueOnce({
        rawText: "invalid",
        parseError,
        parsed: null
      })
      .mockReturnValueOnce({
        rawText: repairedText,
        parseError: null,
        parsed: mockValidPage as any
      });

    vi.spyOn(utils, "parsePage").mockReturnValue(mockValidPage as any);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { type: "text_delta", text: "part1" },
          { type: "text", text: repairedText },
          { type: "text_delta", text: "part2" }
        ]
      })
    });

    const result = await repairAndParseStructured({
      text: "invalid",
      systemPrompt: "System",
      repairPrompt: "Repair",
      structuredOutputRules: "Rules"
    });

    expect(result.parseResult.parsed).toBeDefined();
  });

  it("should use fallback rawText when parsed is null", async () => {
    const parseError: ParseErrorDetail = { code: "invalid_json", message: "Invalid" };
    const fallbackRawText = "fallback content";

    vi.spyOn(utils, "parseStructuredPage")
      .mockReturnValueOnce({
        rawText: fallbackRawText,
        parseError,
        parsed: null
      })
      .mockReturnValueOnce({
        rawText: mockStructuredOutput.rawText,
        parseError: null,
        parsed: mockValidPage as any
      });

    vi.spyOn(utils, "parsePage")
      .mockReturnValueOnce({ valid: false } as any)
      .mockReturnValueOnce(mockValidPage as any);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: mockStructuredOutput.rawText }]
      })
    });

    const result = await repairAndParseStructured({
      text: "invalid",
      systemPrompt: "System",
      repairPrompt: "Repair",
      structuredOutputRules: "Rules"
    });

    // Should have used fallback rawText during first attempt
    expect(result.parsed).toBeDefined();
  });

  it("should include model and max_tokens in repair request", async () => {
    const parseError: ParseErrorDetail = { code: "invalid_json", message: "Invalid" };

    vi.spyOn(utils, "parseStructuredPage")
      .mockReturnValueOnce({
        rawText: "invalid",
        parseError,
        parsed: null
      })
      .mockReturnValueOnce({
        rawText: mockStructuredOutput.rawText,
        parseError: null,
        parsed: mockValidPage as any
      });

    vi.spyOn(utils, "parsePage").mockReturnValue(mockValidPage as any);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: mockStructuredOutput.rawText }]
      })
    });

    await repairAndParseStructured({
      text: "invalid",
      systemPrompt: "System",
      repairPrompt: "Repair",
      structuredOutputRules: "Rules"
    });

    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.model).toContain("claude");
    expect(body.max_tokens).toBe(2500);
    expect(body.stream).toBe(false);
  });

  it("should return both parseResult and parsed object", async () => {
    vi.spyOn(utils, "parseStructuredPage").mockReturnValue({
      rawText: mockStructuredOutput.rawText,
      parseError: null,
      parsed: mockValidPage as any
    });

    vi.spyOn(utils, "parsePage").mockReturnValue(mockValidPage as any);

    const result = await repairAndParseStructured({
      text: mockStructuredOutput.rawText,
      systemPrompt: "System",
      repairPrompt: "Repair",
      structuredOutputRules: "Rules"
    });

    expect(result.parseResult).toBeDefined();
    expect(result.parseResult.parsed).toBeDefined();
    expect(result.parsed).toBeDefined();
    expect(result.parsed.name).toBe("Test Page");
  });
});
