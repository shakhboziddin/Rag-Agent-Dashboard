export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const r = await fetch(process.env.N8N_INGEST_URL, {
      method: "POST",
      headers: { "x-api-key": process.env.N8N_API_KEY },
      body: formData,
    });
    const data = await r.json().catch(() => ({}));
    return Response.json(data, { status: r.status });
  } catch (e) {
    return Response.json({ error: "n8n ulanmadi" }, { status: 502 });
  }
}