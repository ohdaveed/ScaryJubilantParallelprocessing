import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamModelText } from "./chatStream";

// Mock fetch globally
global.fetch = vi.fn();

describe("streamModelText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should make POST request to /api/chat", async () => {
    const mockReader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    await streamModelText({
      msg: "Test message",
      mode: "generate",
      systemPrompt: "Test system prompt",
      onAdvance: vi.fn(),
      onTextDelta: vi.fn(),
      onKarlToolUse: vi.fn(),
      hasStreamText: () => false
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
    );
  });

  it("should include correct model and stream parameters", async () => {
    const mockReader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    await streamModelText({
      msg: "Test",
      mode: "generate",
      systemPrompt: "System",
      onAdvance: vi.fn(),
      onTextDelta: vi.fn(),
      onKarlToolUse: vi.fn(),
      hasStreamText: () => false
    });

    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.stream).toBe(true);
    expect(body.max_tokens).toBe(4000);
    expect(body.model).toContain("claude");
  });

  it("should throw error on HTTP failure", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Server error"
    });

    await expect(
      streamModelText({
        msg: "Test",
        mode: "generate",
        systemPrompt: "System",
        onAdvance: vi.fn(),
        onTextDelta: vi.fn(),
        onKarlToolUse: vi.fn(),
        hasStreamText: () => false
      })
    ).rejects.toThrow();
  });

  it("should parse Server-Sent Events stream", async () => {
    const textDeltaCallback = vi.fn();
    const advanceCallback = vi.fn();

    const streamData = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello "}}\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"world"}}\ndata: [DONE]\n';

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(streamData)
        })
        .mockResolvedValueOnce({ done: true, value: undefined })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    await streamModelText({
      msg: "Test",
      mode: "generate",
      systemPrompt: "System",
      onAdvance: advanceCallback,
      onTextDelta: textDeltaCallback,
      onKarlToolUse: vi.fn(),
      hasStreamText: () => false
    });

    expect(textDeltaCallback).toHaveBeenCalledWith("Hello ");
    expect(textDeltaCallback).toHaveBeenCalledWith("world");
    expect(textDeltaCallback).toHaveBeenCalledTimes(2);
  });

  it("should detect Karl tool use and invoke callback", async () => {
    const karlToolCallback = vi.fn();

    const streamData = 'data: {"type":"content_block_start","content_block":{"type":"tool_use","name":"karl_lookup"}}\n';

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(streamData)
        })
        .mockResolvedValueOnce({ done: true, value: undefined })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    const result = await streamModelText({
      msg: "Test",
      mode: "generate",
      systemPrompt: "System",
      onAdvance: vi.fn(),
      onTextDelta: vi.fn(),
      onKarlToolUse: karlToolCallback,
      hasStreamText: () => false
    });

    expect(karlToolCallback).toHaveBeenCalledWith("karl_lookup");
    expect(result.karlHit).toBe(true);
  });

  it("should return karlHit=false when no tool use detected", async () => {
    const streamData = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Response"}}\ndata: [DONE]\n';

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(streamData)
        })
        .mockResolvedValueOnce({ done: true, value: undefined })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    const result = await streamModelText({
      msg: "Test",
      mode: "generate",
      systemPrompt: "System",
      onAdvance: vi.fn(),
      onTextDelta: vi.fn(),
      onKarlToolUse: vi.fn(),
      hasStreamText: () => false
    });

    expect(result.karlHit).toBe(false);
  });

  it("should handle refine mode without Karl tool use check", async () => {
    const karlToolCallback = vi.fn();
    const streamData = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Refined content"}}\ndata: [DONE]\n';

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(streamData)
        })
        .mockResolvedValueOnce({ done: true, value: undefined })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    const result = await streamModelText({
      msg: "Improve this",
      mode: "refine",
      systemPrompt: "System",
      onAdvance: vi.fn(),
      onTextDelta: vi.fn(),
      onKarlToolUse: karlToolCallback,
      hasStreamText: () => false
    });

    // Refine mode shouldn't track Karl tool use
    expect(karlToolCallback).not.toHaveBeenCalled();
  });

  it("should track progress through text delta callbacks", async () => {
    const advanceCallback = vi.fn();
    let charCount = 0;

    const streamData = 'data: {"type":"content_block_start","content_block":{"type":"tool_use"}}\n' +
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"' + 'a'.repeat(1000) + '"}}\n' +
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"' + 'b'.repeat(1000) + '"}}\n' +
      'data: [DONE]\n';

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(streamData)
        })
        .mockResolvedValueOnce({ done: true, value: undefined })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    await streamModelText({
      msg: "Test",
      mode: "generate",
      systemPrompt: "System",
      onAdvance: advanceCallback,
      onTextDelta: () => { charCount += 1000; },
      onKarlToolUse: vi.fn(),
      hasStreamText: () => charCount > 0
    });

    // Should have called advance with different percentages as text accumulated
    expect(advanceCallback.mock.calls.length).toBeGreaterThan(0);
  });

  it("should handle malformed JSON events gracefully", async () => {
    const textDeltaCallback = vi.fn();

    const streamData = 'data: {malformed json}\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Valid"}}\ndata: [DONE]\n';

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(streamData)
        })
        .mockResolvedValueOnce({ done: true, value: undefined })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    // Should not throw, just skip malformed events
    await streamModelText({
      msg: "Test",
      mode: "generate",
      systemPrompt: "System",
      onAdvance: vi.fn(),
      onTextDelta: textDeltaCallback,
      onKarlToolUse: vi.fn(),
      hasStreamText: () => false
    });

    // Should still capture the valid event
    expect(textDeltaCallback).toHaveBeenCalledWith("Valid");
  });

  it("should use provided callbacks for all event types", async () => {
    const advanceCallback = vi.fn();
    const textDeltaCallback = vi.fn();
    const karlToolCallback = vi.fn();

    const streamData = 'data: {"type":"content_block_start","content_block":{"type":"tool_use","name":"test_tool"}}\n' +
      'data: {"type":"content_block_stop"}\n' +
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Content"}}\n' +
      'data: [DONE]\n';

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(streamData)
        })
        .mockResolvedValueOnce({ done: true, value: undefined })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    await streamModelText({
      msg: "Test",
      mode: "generate",
      systemPrompt: "System",
      onAdvance: advanceCallback,
      onTextDelta: textDeltaCallback,
      onKarlToolUse: karlToolCallback,
      hasStreamText: () => false
    });

    expect(advanceCallback).toHaveBeenCalled();
    expect(textDeltaCallback).toHaveBeenCalled();
    expect(karlToolCallback).toHaveBeenCalled();
  });
});
