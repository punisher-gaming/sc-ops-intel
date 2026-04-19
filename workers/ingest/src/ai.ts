// AI chat endpoint — uses Cloudflare Workers AI (llama-3.1 8B instruct)
// to answer Star Citizen questions. The frontend sends the user's
// question PLUS a compact summary of the top catalog matches that our
// rules-based matcher already found; the LLM synthesizes a natural
// answer grounded in that data.
//
// Why not a full RAG pipeline: our catalog is tiny (ships, blueprints,
// resources, commodities — a few thousand rows) and our rules-based
// matcher already finds the right entities. The LLM's job is just to
// stitch those entities into a readable paragraph, not to search the
// whole Verse.
//
// CORS open since the Pages frontend lives on a different origin.

import type { Env } from "./supabase";

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const SYSTEM_PROMPT = `You are CitizenDex's in-universe advisor — a calm, knowledgeable UEE Navy briefing officer helping new citizens in Star Citizen.

Rules:
- Answer ONLY using the catalog entries provided to you under "Catalog context". If the context is empty, say you don't have that specific data yet but suggest where the user could look on the site.
- Keep answers short — 2–4 sentences max unless the question explicitly asks for detail.
- Be practical: if the user asks "how do I make money", give a concrete actionable answer.
- Use in-game units (aUEC, SCU, UEE year) not real-world equivalents.
- Never make up ship names, blueprint names, commodity prices, or spawn locations. If you need a number and don't have one, say so.
- End answers with a relevant "→ See: /blueprints" style pointer to a section of the site when helpful.
- Lowercase "aUEC". Uppercase "UEE" and "SCU".`;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export async function handleAiChat(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405, headers: CORS });
  }
  if (!env.AI) {
    return Response.json(
      {
        ok: false,
        error:
          "AI binding not configured on this worker. Add `[ai] binding = \"AI\"` in wrangler.toml and redeploy.",
      },
      { status: 503, headers: CORS },
    );
  }

  let body: { question?: string; context?: string; history?: Array<{ role: "user" | "assistant"; content: string }> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid JSON" }, { status: 400, headers: CORS });
  }
  const question = (body.question ?? "").trim();
  if (!question) {
    return Response.json({ ok: false, error: "question required" }, { status: 400, headers: CORS });
  }
  if (question.length > 800) {
    return Response.json({ ok: false, error: "question too long (max 800 chars)" }, { status: 400, headers: CORS });
  }
  // Soft rate-limit by length of context, not IP — calling budget is the
  // real constraint. Context is provided by the frontend from its existing
  // rules-based match; typically 1–2 KB.
  const context = (body.context ?? "").slice(0, 4000);

  // History: last 4 turns max so we stay under 8k token budget
  const history = (body.history ?? []).slice(-4);

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];
  if (context) {
    messages.push({
      role: "system",
      content: `Catalog context (top matches from our database):\n${context}`,
    });
  }
  for (const h of history) {
    messages.push(h);
  }
  messages.push({ role: "user", content: question });

  try {
    const result = await env.AI.run(MODEL, { messages, max_tokens: 512 });
    return Response.json(
      { ok: true, answer: result.response, model: MODEL },
      { headers: CORS },
    );
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    return Response.json(
      { ok: false, error: `AI call failed: ${msg}` },
      { status: 502, headers: CORS },
    );
  }
}
