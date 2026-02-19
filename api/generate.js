export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Get webhook URL from Vercel environment variable
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    return res.status(500).json({
      error: "Server misconfiguration: N8N_WEBHOOK_URL not set",
    });
  }

  try {
    // Parse request body
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    // Call n8n webhook
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    // Get response as text (because your webhook returns HTML)
    const responseText = await n8nResponse.text();

    // If n8n failed
    if (!n8nResponse.ok) {
      return res.status(500).json({
        error: "n8n webhook error",
        details: responseText,
      });
    }

    // Return HTML to browser
    res.status(200);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(responseText);

  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
}
