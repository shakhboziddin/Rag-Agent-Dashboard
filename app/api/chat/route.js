export async function POST(req) {
  try {
    const body = await req.json();
    const r = await fetch(process.env.N8N_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.N8N_API_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    return Response.json(data, { status: r.status });
  } catch (e) {
    return Response.json({ error: "n8n ulanmadi" }, { status: 502 });
  }
}