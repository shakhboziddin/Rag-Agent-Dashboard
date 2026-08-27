export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    const body = await req.json();

    if (!process.env.N8N_NOTION_URL) {
      return Response.json(
        { error: "N8N_NOTION_URL is not set" },
        { status: 500 }
      );
    }

    const r = await fetch(process.env.N8N_NOTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.N8N_API_KEY,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(body),
    });

    const raw = await r.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { error: "n8n returned non-JSON", raw: raw.slice(0, 500) };
    }
    return Response.json(data, { status: r.status });
  } catch (e) {
    return Response.json(
      { error: String(e && e.message ? e.message : e) },
      { status: 502 }
    );
  }
}