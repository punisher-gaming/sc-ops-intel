// AI chat endpoint, uses Cloudflare Workers AI (llama-3.1 8B instruct)
// to answer Star Citizen questions. The frontend sends the user's
// question PLUS a compact summary of the top catalog matches that our
// rules-based matcher already found; the LLM synthesizes a natural
// answer grounded in that data.
//
// Why not a full RAG pipeline: our catalog is tiny (ships, blueprints,
// resources, commodities, a few thousand rows) and our rules-based
// matcher already finds the right entities. The LLM's job is just to
// stitch those entities into a readable paragraph, not to search the
// whole Verse.
//
// CORS open since the Pages frontend lives on a different origin.

import type { Env } from "./supabase";

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const SYSTEM_PROMPT = `You are CitizenDex's in-universe advisor, a calm, knowledgeable UEE Navy briefing officer helping new citizens in Star Citizen.

Rules:
- Prefer the "Catalog context" (from our live-synced database) when present. If it's not there, use "Wiki context" (from Star Citizen Wiki) as a secondary source. If neither, say you don't have that data but point the user to /ships, /blueprints, /lore, /community, etc.
- Keep answers short, 2–4 sentences max unless the question explicitly asks for detail.
- Be practical: if the user asks "how do I make money", give a concrete actionable answer.
- Use in-game units (aUEC, SCU, UEE year) not real-world equivalents.
- Never make up ship names, blueprint names, commodity prices, or spawn locations. If you need a number and don't have one, say so.
- When you draw from Wiki context, end your answer with a note like "(Sourced from Star Citizen Wiki)".
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
  // Soft rate-limit by length of context, not IP, calling budget is the
  // real constraint. Context is provided by the frontend from its existing
  // rules-based match; typically 1–2 KB.
  const context = (body.context ?? "").slice(0, 4000);

  // History: last 4 turns max so we stay under 8k token budget
  const history = (body.history ?? []).slice(-4);

  // When our local catalog has nothing for the question, reach out to
  // Star Citizen Wiki's opensearch API and pull the top article intros
  // as supplementary context. Keeps the AI grounded in real sources
  // rather than hallucinating.
  let wikiContext = "";
  if (!context || context.trim().length < 60) {
    wikiContext = await fetchWikiContext(question);
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];
  if (context) {
    messages.push({
      role: "system",
      content: `Catalog context (top matches from our live database):\n${context}`,
    });
  }
  if (wikiContext) {
    messages.push({
      role: "system",
      content: `Wiki context (excerpts from Star Citizen Wiki, use only if catalog context is empty):\n${wikiContext}`,
    });
  }
  for (const h of history) {
    messages.push(h);
  }
  messages.push({ role: "user", content: question });

  try {
    const result = await env.AI.run(MODEL, { messages, max_tokens: 512 });
    return Response.json(
      {
        ok: true,
        answer: result.response,
        model: MODEL,
        sourcedFromWiki: Boolean(wikiContext),
      },
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

// Query SC Wiki for the user's question and return up to 3 article
// intros as a single context string. Uses MediaWiki's opensearch to
// find titles, then query+extracts to pull plain-text intros.
//
// Edge-cached 1 hour, popular questions ("cutlass black") will hit
// cache rather than bouncing through the wiki every time.
async function fetchWikiContext(question: string): Promise<string> {
  try {
    // Strip obvious noise words so the search targets nouns
    const cleaned = question
      .replace(/[?.!,;:]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 8)
      .join(" ");
    if (!cleaned) return "";

    // 1. Full-text search for candidate titles. opensearch (title-prefix
    //    only) misses "Who was Nick Croshaw" because no title starts with
    //    "Who". list=search does proper full-text relevance ranking.
    const searchUrl =
      `https://starcitizen.tools/api.php?action=query&format=json&list=search&srlimit=3&srprop=&srsearch=` +
      encodeURIComponent(cleaned);
    const searchRes = await fetch(searchUrl, {
      headers: { "user-agent": "sc-ops-intel-ai-assistant" },
    });
    if (!searchRes.ok) return "";
    const searchBody = (await searchRes.json()) as {
      query?: { search?: Array<{ title: string }> };
    };
    const titles = (searchBody.query?.search ?? [])
      .map((s) => s.title)
      .filter(Boolean);
    if (titles.length === 0) return "";

    // 2. extracts for those titles, intro plain-text
    const extractsUrl =
      `https://starcitizen.tools/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&titles=` +
      encodeURIComponent(titles.slice(0, 3).join("|"));
    const extractsRes = await fetch(extractsUrl, {
      headers: { "user-agent": "sc-ops-intel-ai-assistant" },
    });
    if (!extractsRes.ok) return "";
    const extractsBody = (await extractsRes.json()) as {
      query?: { pages?: Record<string, { title?: string; extract?: string }> };
    };
    const pages = extractsBody.query?.pages ?? {};
    const parts: string[] = [];
    for (const page of Object.values(pages)) {
      const text = (page.extract ?? "").trim();
      if (text.length === 0) continue;
      // Cap each extract so the prompt stays reasonable
      parts.push(
        `## ${page.title ?? "Wiki article"}\n${text.slice(0, 800)}`,
      );
    }
    return parts.join("\n\n").slice(0, 3500);
  } catch {
    return "";
  }
}
