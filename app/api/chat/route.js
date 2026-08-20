export async function POST(req) {
  try {
    const body = await req.json();

    if (!process.env.N8N_CHAT_URL) {
      return Response.json({
        debug_error: "N8N_CHAT_URL topilmadi (Vercel env var yo'q)",
      }, { status: 500 });
    }

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
      data = {
        debug_error: "n8n dan JSON emas javob keldi",
        debug_status: r.status,
        debug_url_used: process.env.N8N_CHAT_URL,
        debug_raw_response: rawText.slice(0, 800),
      };
    }

    return Response.json(data, { status: r.status });
  } catch (e) {
    return Response.json({
      debug_error: "fetch o'zi ishlamadi",
      debug_message: String(e && e.message ? e.message : e),
      debug_cause: String(e && e.cause ? e.cause : ""),
      debug_url_used: process.env.N8N_CHAT_URL || "UNDEFINED",
    }, { status: 502 });
  }
}