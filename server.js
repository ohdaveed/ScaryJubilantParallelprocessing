import express from "express";
import { createServer } from "http";

const app = express();
app.use(express.json({ limit: "1mb" }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.post("/api/chat", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured. Please add it in the Secrets panel." });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-04-04",
      },
      body: JSON.stringify(req.body),
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (["content-type", "cache-control", "transfer-encoding"].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(value);
      }
    };
    pump().catch(err => { console.error("Stream error:", err); res.end(); });
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Failed to connect to Anthropic API" });
  }
});

const PORT = 3001;
createServer(app).listen(PORT, () => {
  console.log(`API proxy running on port ${PORT}`);
});
