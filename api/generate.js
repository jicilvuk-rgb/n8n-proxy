// /api/generate.js  (Vercel Serverless Function)
// Receives: POST { email: "..." }
// Calls:   your n8n webhook (POST) with same payload
// Returns:
//   - If n8n returns HTML -> forwards HTML so browser renders it
//   - If n8n returns JSON -> forwards JSON (for errors/status)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

    if (!N8N_WEBHOOK_URL) {
      return res
        .status(500)
        .json({ error: "Missing N8N_WEBHOOK_URL env var" });
    }

    // Parse body safely (Vercel usually gives req.body already as object)
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const email = (body.email || "").trim();

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    // Call n8n webhook
    const upstream = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Optional: simple shared secret (recommended)
        // "X-API-KEY": process.env.API_KEY || "",
      },
      body: JSON.stringify({ email }),
    });

    const contentType = upstream.headers.get("content-type") || "";

    // If n8n returns HTML, forward HTML so browser renders it
    if (contentType.includes("text/html")) {
      const html = await upstream.text();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(upstream.status).send(html);
    }

    // If n8n returns JSON, forward JSON
    if (contentType.includes("application/json")) {
      const json = await upstream.json().catch(() => null);
      return res.status(upstream.status).json(
        json ?? { error: "Invalid JSON from n8n", status: upstream.status }
      );
    }

    // Otherwise forward plain text (helps debugging)
    const text = await upstream.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(upstream.status).send(text);
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: String(err?.message || err),
    });
  }
}
