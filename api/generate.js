export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { email } = req.body || {};
    if (!email) {
      res.status(400).json({ error: "Missing email" });
      return;
    }

    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;     // set in Vercel env
    const SHARED_SECRET   = process.env.SHARED_SECRET;       // set in Vercel env

    if (!N8N_WEBHOOK_URL) {
      res.status(500).json({ error: "Missing N8N_WEBHOOK_URL env var" });
      return;
    }
    if (!SHARED_SECRET) {
      res.status(500).json({ error: "Missing SHARED_SECRET env var" });
      return;
    }

    // IMPORTANT:
    // If your n8n Webhook node is GET-only, change method to "GET"
    // and append "?email=" instead of sending JSON.
    const upstream = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shared-secret": SHARED_SECRET
      },
      body: JSON.stringify({ email })
    });

    const ct = (upstream.headers.get("content-type") || "").toLowerCase();

    // If n8n returns HTML, pass-through as HTML
    if (ct.includes("text/html")) {
      const html = await upstream.text();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(upstream.status).send(html);
      return;
    }

    // If n8n returns JSON with redirectUrl, keep it JSON
    if (ct.includes("application/json")) {
      const data = await upstream.json();
      res.status(upstream.status).json(data);
      return;
    }

    // Fallback: pass text
    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (err) {
    res.status(500).json({ error: "Proxy error", details: String(err?.message || err) });
  }
}
