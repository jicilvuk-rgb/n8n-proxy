export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Missing email" });

    // Your n8n webhook URL goes in an ENV var (NOT in index.html)
    const N8N_URL = process.env.N8N_WEBHOOK_URL;
    // Simple shared secret so random people can't spam your webhook
    const N8N_SECRET = process.env.N8N_SHARED_SECRET;

    if (!N8N_URL) return res.status(500).json({ error: "Missing N8N_WEBHOOK_URL env var" });
    if (!N8N_SECRET) return res.status(500).json({ error: "Missing N8N_SHARED_SECRET env var" });

    const r = await fetch(N8N_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shared-secret": N8N_SECRET
      },
      body: JSON.stringify({ email })
    });

    const text = await r.text();

    // n8n should return JSON like: { "redirectUrl": "https://..." }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "n8n did not return JSON", raw: text.slice(0, 500) });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
