export async function POST(req) {
  try {
    const body = await req.json();
    const r = await fetch(process.env.N8N_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.N8N_API_KEY,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(body),
    });

    const rawText = await r.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      // JSON parsing failed — return the raw text so we can SEE what n8n/ngrok actually sent
      data = {
        debug_error: "n8n dan kelgan javob JSON emas",
        debug_status: r.status,
        debug_url_used: process.env.N8N_CHAT_URL || "N8N_CHAT_URL IS UNDEFINED",
        debug_raw_response: rawText.slice(0, 1000),
      };
    }

    return Response.json(data, { status: r.status });
  } catch (e) {
    return Response.json({
      debug_error: "fetch o'zi ishlamadi",
      debug_message: String(e.message || e),
      debug_url_used: process.env.N8N_CHAT_URL || "N8N_CHAT_URL IS UNDEFINED",
    }, { status: 502 });
  }
}