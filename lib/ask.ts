// Rules-based quick-answer engine for common questions.
//
// Recognises patterns like:
//   "where to mine tungsten"
//   "mine tungsten"
//   "find me a sniper rifle"
//   "buy agricium"
//   "sell laranite"
//   "show me the polaris"
//
// Runs entirely against our Supabase data — no AI, no API keys, no latency
// beyond the DB round-trip. Falls back to "no match" for anything it
// doesn't recognise; user can then fall through to Global Search.

import { createClient } from "./supabase/client";

export type Answer =
  | {
      kind: "resource";
      intent: "mine" | "find";
      query: string;
      hits: Array<{
        id: string;
        name: string;
        subtitle: string;
        href: string;
        detail: string;
      }>;
    }
  | {
      kind: "blueprint";
      query: string;
      hits: Array<{
        id: string;
        name: string;
        subtitle: string;
        href: string;
      }>;
    }
  | {
      kind: "commodity";
      intent: "buy" | "sell";
      query: string;
      hits: Array<{
        id: string;
        name: string;
        subtitle: string;
        href: string;
      }>;
    }
  | {
      kind: "ship";
      query: string;
      hits: Array<{
        id: string;
        name: string;
        subtitle: string;
        href: string;
      }>;
    }
  | { kind: "none"; query: string };

const MINE_RX =
  /\b(?:where|how|best(?: spot)?)(?: to| do i| can i)?\s+(?:mine|find|harvest|get)\s+(.+)$/i;
const MINE_SHORT_RX = /^(?:mine|harvest|extract)\s+(.+)$/i;
const FIND_RX = /^(?:find|show|search)\s+(?:me\s+)?(?:a|an|the)?\s*(.+)$/i;
const BUY_RX = /^(?:buy|where to buy)\s+(.+)$/i;
const SELL_RX = /^(?:sell|where to sell)\s+(.+)$/i;
const BP_RX =
  /\b(?:blueprint|recipe|how (?:do i |to )?(?:craft|make))\s+(?:for\s+)?(.+)$/i;
const SHIP_RX = /^(?:ship|show me|info on)\s+(.+)$/i;

function clean(q: string): string {
  return q.trim().replace(/^the\s+/i, "").replace(/[?.!]+$/, "").trim();
}

export async function ask(raw: string): Promise<Answer> {
  const input = raw.trim();
  if (!input) return { kind: "none", query: "" };

  // Pattern: mine / harvest / find-resource intent
  const mineMatch = input.match(MINE_RX) ?? input.match(MINE_SHORT_RX);
  if (mineMatch) {
    const term = clean(mineMatch[1]);
    return await findResource(term, "mine");
  }

  // Pattern: buy commodity
  const buyMatch = input.match(BUY_RX);
  if (buyMatch) {
    const term = clean(buyMatch[1]);
    return await findCommodity(term, "buy");
  }

  // Pattern: sell commodity
  const sellMatch = input.match(SELL_RX);
  if (sellMatch) {
    const term = clean(sellMatch[1]);
    return await findCommodity(term, "sell");
  }

  // Pattern: blueprint / recipe
  const bpMatch = input.match(BP_RX);
  if (bpMatch) {
    const term = clean(bpMatch[1]);
    return await findBlueprint(term);
  }

  // Pattern: ship
  const shipMatch = input.match(SHIP_RX);
  if (shipMatch) {
    const term = clean(shipMatch[1]);
    return await findShip(term);
  }

  // Bare "find/show" with a noun
  const findMatch = input.match(FIND_RX);
  if (findMatch) {
    const term = clean(findMatch[1]);
    // Try blueprints first, then ships — both common for "find"
    const bp = await findBlueprint(term);
    if (bp.kind === "blueprint" && bp.hits.length > 0) return bp;
    const sh = await findShip(term);
    if (sh.kind === "ship" && sh.hits.length > 0) return sh;
    return { kind: "none", query: input };
  }

  // No pattern matched — bare term. Try all four lookups in parallel and
  // return the one with the strongest hit.
  const bare = clean(input);
  const [r, b, c, s] = await Promise.all([
    findResource(bare, "find"),
    findBlueprint(bare),
    findCommodity(bare, "buy"),
    findShip(bare),
  ]);
  const candidates = [r, b, c, s].filter((x) => x.kind !== "none" && (x as { hits?: unknown[] }).hits && ((x as { hits: unknown[] }).hits.length > 0));
  if (candidates.length === 0) return { kind: "none", query: input };
  // Prefer the one whose top hit exactly matches (case-insensitive) the query
  const exact = candidates.find((x) => {
    const firstName = (x as { hits: Array<{ name: string }> }).hits[0]?.name;
    return firstName && firstName.toLowerCase() === bare.toLowerCase();
  });
  return exact ?? candidates[0];
}

async function findResource(term: string, intent: "mine" | "find"): Promise<Answer> {
  const client = createClient();
  const { data, error } = await client
    .from("resources")
    .select("id, name, kind")
    .ilike("name", `%${term}%`)
    .limit(5);
  if (error || !data || data.length === 0) return { kind: "none", query: term };

  // For each resource, pull its top spawn location by probability
  const ids = data.map((r) => r.id);
  const { data: locs } = await client
    .from("resource_locations")
    .select("resource_id, system, location_name, group_probability")
    .in("resource_id", ids)
    .order("group_probability", { ascending: false })
    .limit(50);

  const topByResource = new Map<string, { system: string | null; location_name: string | null; probability: number | null }>();
  for (const l of locs ?? []) {
    if (!topByResource.has(l.resource_id)) {
      topByResource.set(l.resource_id, {
        system: l.system,
        location_name: l.location_name,
        probability: l.group_probability,
      });
    }
  }

  return {
    kind: "resource",
    intent,
    query: term,
    hits: data.map((r) => {
      const top = topByResource.get(r.id);
      return {
        id: r.id,
        name: r.name,
        subtitle: r.kind ? r.kind.replace(/_/g, " ") : "resource",
        href: `/resources?id=${encodeURIComponent(r.id)}`,
        detail: top
          ? `Best spot: ${top.location_name ?? "unknown"}${top.system ? ` (${top.system})` : ""}${top.probability ? ` · ${(top.probability * 100).toFixed(1)}% spawn chance` : ""}`
          : "No spawn locations recorded yet",
      };
    }),
  };
}

async function findBlueprint(term: string): Promise<Answer> {
  const client = createClient();
  const { data, error } = await client
    .from("blueprints")
    .select("id, name, output_item_type, output_item_subtype, output_grade")
    .ilike("name", `%${term}%`)
    .limit(6);
  if (error || !data || data.length === 0) return { kind: "none", query: term };
  return {
    kind: "blueprint",
    query: term,
    hits: data.map((b) => ({
      id: b.id,
      name: b.name,
      subtitle: [b.output_item_type, b.output_item_subtype, b.output_grade && `G${b.output_grade}`]
        .filter(Boolean)
        .join(" · "),
      href: `/blueprints?id=${encodeURIComponent(b.id)}`,
    })),
  };
}

async function findCommodity(term: string, intent: "buy" | "sell"): Promise<Answer> {
  const client = createClient();
  const { data, error } = await client
    .from("commodities")
    .select("id, name, kind")
    .ilike("name", `%${term}%`)
    .limit(5);
  if (error || !data || data.length === 0) return { kind: "none", query: term };
  return {
    kind: "commodity",
    intent,
    query: term,
    hits: data.map((c) => ({
      id: c.id,
      name: c.name,
      subtitle: `${c.kind ?? "commodity"} · ${intent === "buy" ? "find lowest aUEC" : "find highest aUEC"}`,
      href: `/commodities?id=${encodeURIComponent(c.id)}`,
    })),
  };
}

async function findShip(term: string): Promise<Answer> {
  const client = createClient();
  const { data, error } = await client
    .from("ships")
    .select("id, name, manufacturer, role, size_class")
    .ilike("name", `%${term}%`)
    .limit(5);
  if (error || !data || data.length === 0) return { kind: "none", query: term };
  return {
    kind: "ship",
    query: term,
    hits: data.map((s) => ({
      id: s.id,
      name: s.name,
      subtitle: [s.manufacturer, s.role, s.size_class].filter(Boolean).join(" · "),
      href: `/ships?id=${encodeURIComponent(s.id)}`,
    })),
  };
}
