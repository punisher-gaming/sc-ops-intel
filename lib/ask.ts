// Quick-answer engine for the /ask page. Recognises intent keywords
// (mine, harvest, buy, sell, recipe, blueprint, ship) anywhere in the
// query, extracts the noun, and searches the relevant Supabase table.
// Falls back to a parallel search across all four catalogs for bare
// terms. Returns grouped hits — empty arrays for catalogs with no
// matches so the UI can hide them.

import { createClient } from "./supabase/client";
import {
  fetchBlueprintsThatYield,
  displayName as bpDisplayName,
  dismantleReturns,
  refinedMaterialFromResourceName,
} from "./blueprints";

export type Intent = "mine" | "buy" | "sell" | "recipe" | "uses" | "ship" | "general";

export type Hit = {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  detail?: string;
};

export interface Answer {
  query: string;
  intent: Intent;
  resources: Hit[];
  blueprints: Hit[];
  commodities: Hit[];
  ships: Hit[];
  total: number;
}

const STOP_WORDS = new Set([
  "where",
  "is",
  "the",
  "best",
  "spot",
  "place",
  "to",
  "for",
  "do",
  "i",
  "a",
  "an",
  "how",
  "can",
  "find",
  "me",
  "show",
  "tell",
  "what",
  "are",
  "search",
  "info",
  "on",
  "of",
  "give",
  "get",
  "look",
  "up",
  "in",
  "at",
]);

const INTENT_RX: Array<{ rx: RegExp; intent: Intent }> = [
  // "uses" comes BEFORE "recipe" so "what blueprints USE titanium" wins over
  // "what blueprints make titanium". Also catches "what is X used for".
  { rx: /\b(uses?|used|need|needs|requires?|consume|consumes)\b/i, intent: "uses" },
  { rx: /\b(mine|mining|harvest|harvesting|extract|extraction|gather)\b/i, intent: "mine" },
  { rx: /\b(buy|buying|purchase|where to buy)\b/i, intent: "buy" },
  { rx: /\b(sell|selling|where to sell)\b/i, intent: "sell" },
  { rx: /\b(recipe|recipes|blueprint|blueprints|craft|crafting|fabricate|make)\b/i, intent: "recipe" },
  { rx: /\b(ship|hull|fleet|spacecraft|vessel)\b/i, intent: "ship" },
];

function detectIntent(input: string): Intent {
  for (const { rx, intent } of INTENT_RX) {
    if (rx.test(input)) return intent;
  }
  return "general";
}

function extractTerm(input: string): string {
  // Strip punctuation, split, drop stopwords + intent verbs themselves
  const cleaned = input
    .toLowerCase()
    .replace(/[?.!,;:'"()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned.split(" ").filter((t) => {
    if (!t) return false;
    if (STOP_WORDS.has(t)) return false;
    // Drop intent verbs themselves
    for (const { rx } of INTENT_RX) {
      if (rx.test(t)) return false;
    }
    return true;
  });

  return tokens.join(" ").trim();
}

export async function ask(raw: string): Promise<Answer> {
  const input = raw.trim();
  const intent = detectIntent(input);
  const term = extractTerm(input);

  const empty: Answer = {
    query: input,
    intent,
    resources: [],
    blueprints: [],
    commodities: [],
    ships: [],
    total: 0,
  };

  if (!term) return empty;

  // Run all four searches in parallel; intent affects ordering of detail
  // (e.g. resource hits get "best spot" detail when intent is mine).
  const [resources, blueprints, commodities, ships] = await Promise.all([
    // Always find resources — needed for the "what uses X" reverse lookup
    // even when the user's wording leaned toward recipe/uses.
    findResources(term, intent === "mine" || intent === "general"),
    intent === "recipe" || intent === "uses" || intent === "general" ? findBlueprints(term) : Promise.resolve([] as Hit[]),
    intent === "buy" || intent === "sell" || intent === "general" ? findCommodities(term, intent) : Promise.resolve([] as Hit[]),
    intent === "ship" || intent === "general" ? findShips(term) : Promise.resolve([] as Hit[]),
  ]);

  // Reverse lookup: if we matched any resource by name, find blueprints that
  // dismantle into it. Triggers for "uses" / "recipe" intents and also for
  // bare "general" queries like "Torite ore" — useful for both phrasings.
  // Only runs against the TOP resource match to keep the query bounded.
  let bpFromResource: Hit[] = [];
  const wantReverse = intent === "uses" || intent === "recipe" || intent === "general";
  if (wantReverse && resources.length > 0) {
    const top = resources[0];
    const material = refinedMaterialFromResourceName(top.name) ?? top.name;
    bpFromResource = await findBlueprintsYielding(material, top.name);
  }

  // For non-general intents, we still want to surface a cross-section if
  // the primary search comes up empty (e.g. user typed "buy fs-9" — there's
  // no commodity called fs-9, but there is a blueprint).
  let bp = blueprints;
  let res = resources;
  let cm = commodities;
  let sh = ships;
  if (intent === "buy" || intent === "sell") {
    if (cm.length === 0) {
      [bp, sh] = await Promise.all([findBlueprints(term), findShips(term)]);
    }
  } else if (intent === "ship" && sh.length === 0) {
    bp = await findBlueprints(term);
  } else if (intent === "recipe" && bp.length === 0) {
    sh = await findShips(term);
  } else if (intent === "mine" && res.length === 0) {
    cm = await findCommodities(term, "buy");
  }

  // Merge reverse-lookup blueprints with name-match blueprints, dedup by id.
  // Reverse hits go FIRST when the intent is "uses" since that's the explicit
  // ask; otherwise name matches lead.
  if (bpFromResource.length > 0) {
    const seen = new Set(bp.map((h) => h.id));
    const extra = bpFromResource.filter((h) => !seen.has(h.id));
    bp = intent === "uses" ? [...bpFromResource, ...bp.filter((h) => !bpFromResource.some((r) => r.id === h.id))] : [...bp, ...extra];
  }

  return {
    query: input,
    intent,
    resources: res,
    blueprints: bp,
    commodities: cm,
    ships: sh,
    total: res.length + bp.length + cm.length + sh.length,
  };
}

// Reverse lookup: blueprints whose dismantle yields the given resource.
// We surface them as blueprint hits with "Dismantles into <resource>" detail
// so the user immediately sees why each row is here.
async function findBlueprintsYielding(material: string, resourceName: string): Promise<Hit[]> {
  try {
    const bps = await fetchBlueprintsThatYield(material);
    return bps.slice(0, 8).map((b) => {
      const yieldEntry = dismantleReturns(b).find((r) => r.Name === material);
      const qty = yieldEntry?.QuantityScu;
      const qtyStr = typeof qty === "number" ? ` (${qty} SCU)` : "";
      return {
        id: b.id,
        name: bpDisplayName(b),
        subtitle: [b.output_item_type, b.output_item_subtype, b.output_grade && `G${b.output_grade}`]
          .filter(Boolean)
          .join(" · "),
        href: `/blueprints?id=${encodeURIComponent(b.id)}`,
        detail: `Dismantles into ${resourceName}${qtyStr}`,
      };
    });
  } catch {
    return [];
  }
}

async function findResources(term: string, withTopSpawn: boolean): Promise<Hit[]> {
  const client = createClient();
  const { data, error } = await client
    .from("resources")
    .select("id, name, kind")
    .ilike("name", `%${term}%`)
    .limit(5);
  if (error || !data || data.length === 0) return [];

  let topByResource = new Map<string, { system: string | null; location_name: string | null; probability: number | null }>();
  if (withTopSpawn) {
    const ids = data.map((r) => r.id);
    const { data: locs } = await client
      .from("resource_locations")
      .select("resource_id, system, location_name, group_probability")
      .in("resource_id", ids)
      .order("group_probability", { ascending: false })
      .limit(50);
    for (const l of locs ?? []) {
      if (!topByResource.has(l.resource_id)) {
        topByResource.set(l.resource_id, {
          system: l.system,
          location_name: l.location_name,
          probability: l.group_probability,
        });
      }
    }
  }

  return data.map((r) => {
    const top = topByResource.get(r.id);
    return {
      id: r.id,
      name: r.name,
      subtitle: r.kind ? r.kind.replace(/_/g, " ") : "resource",
      href: `/resources?id=${encodeURIComponent(r.id)}`,
      detail: top
        ? `Best spot: ${top.location_name ?? "unknown"}${top.system ? ` (${top.system})` : ""}${top.probability != null ? ` · ${(Number(top.probability) * 100).toFixed(1)}% spawn chance` : ""}`
        : undefined,
    };
  });
}

async function findBlueprints(term: string): Promise<Hit[]> {
  const client = createClient();
  const { data, error } = await client
    .from("blueprints")
    .select("id, name, output_item_type, output_item_subtype, output_grade")
    .ilike("name", `%${term}%`)
    .limit(6);
  if (error || !data || data.length === 0) return [];
  return data.map((b) => ({
    id: b.id,
    name: b.name,
    subtitle: [b.output_item_type, b.output_item_subtype, b.output_grade && `G${b.output_grade}`]
      .filter(Boolean)
      .join(" · "),
    href: `/blueprints?id=${encodeURIComponent(b.id)}`,
  }));
}

async function findCommodities(term: string, intent: "buy" | "sell" | "general"): Promise<Hit[]> {
  const client = createClient();
  const { data, error } = await client
    .from("commodities")
    .select("id, name, kind")
    .ilike("name", `%${term}%`)
    .limit(5);
  if (error || !data || data.length === 0) return [];
  const verb = intent === "sell" ? "Where to sell" : "Where to buy";
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    subtitle: c.kind ?? "commodity",
    href: `/commodities?id=${encodeURIComponent(c.id)}`,
    detail: intent !== "general" ? `${verb} → see availability + community prices` : undefined,
  }));
}

async function findShips(term: string): Promise<Hit[]> {
  const client = createClient();
  const { data, error } = await client
    .from("ships")
    .select("id, name, manufacturer, role, size_class")
    .ilike("name", `%${term}%`)
    .limit(5);
  if (error || !data || data.length === 0) return [];
  return data.map((s) => ({
    id: s.id,
    name: s.name,
    subtitle: [s.manufacturer, s.role, s.size_class].filter(Boolean).join(" · "),
    href: `/ships?id=${encodeURIComponent(s.id)}`,
  }));
}
