// Meta Loadouts — math-optimal weapon recommendations per ship.
//
// Architecture:
//   1. SHIP_HARDPOINTS hand-curates which weapon slots each ship has
//      (size + mount type). Sourced from Star Citizen Wiki + Erkul; this
//      data isn't in the SC Wiki REST API so we maintain it inline. Add
//      a new entry when you want to expand coverage.
//   2. extractWeaponStats() defensively reads DPS / alpha / projectile
//      speed / damage type out of a weapon row's source_data jsonb. The
//      scunpacked schema varies per weapon kind so we walk many candidate
//      paths and bail to null when nothing fits.
//   3. PROFILES define how to score a weapon for a given build intent.
//   4. computeLoadout() picks the highest-scoring weapon that fits each
//      hardpoint, returns the loadout + summary stats.
//
// All math is deterministic — given the same weapon catalog snapshot,
// the same loadout is recommended every time. v1 is conservative on
// purpose: when stats are missing we mark the slot "math unavailable"
// rather than guess.

import type { Item } from "./items";
import { createClient } from "./supabase/client";

// Fetch all ship-mount weapons with their source_data jsonb. Trusts
// the size column (1-9 = ship weapon range; personal weapons sit at
// size 0 or null so they're naturally excluded). Returns the slim
// list ready to feed into extractWeaponStats().
export async function fetchShipWeaponCandidates(): Promise<Item[]> {
  const client = createClient();
  const PAGE = 1000;
  const out: Item[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("weapons")
      .select(
        "id, class_name, name, manufacturer, type, subtype, classification, grade, size, tags, source_data",
      )
      .gte("size", 1)
      .lte("size", 9)
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Item[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  // Personal/handheld weapons sometimes leak in with size > 0. Drop
  // anything explicitly typed as personal.
  return out.filter((w) => {
    const t = (w.type ?? "").toLowerCase();
    return !t.includes("personal");
  });
}

// ── HARDPOINT DEFINITIONS ────────────────────────────────────────────

/** A single weapon mount on a ship. */
export interface Hardpoint {
  id: string;          // unique within the ship: "nose", "wing-left", "ball-turret", etc.
  label: string;       // human-readable: "Nose", "Left Wing", "Ball Turret"
  size: number;        // 1-9 SC weapon size
  /** "fixed" = hardmount, "gimbal" = motorized aim assist, "turret" = remote turret. */
  mount: "fixed" | "gimbal" | "turret";
  /** If set, only weapons in this category fit (e.g. some ships are
   *  ballistic-locked on a slot). Most slots accept anything. */
  weaponClass?: "ballistic" | "energy";
}

/** A non-weapon system slot (shield, power plant, cooler, etc). The
 *  game enforces one component per slot per category; size constrains
 *  which catalog parts fit. */
export interface ComponentSlot {
  id: string;
  label: string;
  category: ComponentCategory;
  size: number;
}

export type ComponentCategory =
  | "shield"
  | "powerplant"
  | "cooler"
  | "quantum";

/** Armor + hull stats lifted from ships.source_data — used to compute
 *  effective HP and rank tanks vs glass cannons. Multipliers are
 *  incoming-damage scalars (1.0 = full damage, 0.6 = 40% reduction). */
export interface ShipDurability {
  hullHp: number | null;
  armorHp: number | null;
  /** Factory shield HP (the shield that ships in the box). Useful as
   *  a fallback when we can't pick a shield component. */
  factoryShieldHp: number | null;
  resists: {
    energy: number | null;
    physical: number | null;
    thermal: number | null;
    distortion: number | null;
  };
}

export interface ShipLoadoutDef {
  /** Match against the ships table `name` (case-insensitive). */
  shipName: string;
  /** Manufacturer code or name for display. */
  manufacturer: string;
  /** Short tagline for the meta-loadouts ship picker. */
  blurb: string;
  hardpoints: Hardpoint[];
  /** Shields / power / cooler / quantum slots. Some ships have multiples
   *  (e.g. Freelancer MAX has 2× S2 shields) — express each as its own
   *  entry with a unique id. */
  components: ComponentSlot[];
  /** Hull / armor / resists — drives the Tank profile + leaderboard. */
  durability?: ShipDurability;
}

/**
 * v1 coverage — popular fighter / multicrew picks where math-optimal
 * builds are most relevant. Expand by adding entries; the UI auto-shows
 * any ship listed here that also has a row in our `ships` table.
 *
 * Hardpoint sizes verified against erkul.games + Star Citizen Wiki
 * 4.7.1-LIVE. May drift slightly when CIG re-tunes a hull — flag any
 * mismatches and we'll update.
 */
export const SHIP_HARDPOINTS: ShipLoadoutDef[] = [
  {
    shipName: "F7C Hornet Mk II",
    manufacturer: "Anvil",
    blurb: "Civilian space-superiority workhorse. Triangle wing layout + nose ball.",
    hardpoints: [
      { id: "nose", label: "Nose ball turret", size: 4, mount: "turret" },
      { id: "wing-l", label: "Left wing", size: 3, mount: "gimbal" },
      { id: "wing-r", label: "Right wing", size: 3, mount: "gimbal" },
    ],
    components: [
      { id: "shield", label: "Shield", category: "shield", size: 2 },
      { id: "power", label: "Power plant", category: "powerplant", size: 2 },
      { id: "cooler", label: "Cooler", category: "cooler", size: 2 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 2 },
    ],
  },
  {
    shipName: "F7A Hornet Mk II",
    manufacturer: "Anvil",
    blurb: "Military Hornet — bigger wing slots, harder hitter than the F7C.",
    hardpoints: [
      { id: "nose", label: "Nose ball turret", size: 4, mount: "turret" },
      { id: "wing-l", label: "Left wing", size: 5, mount: "gimbal" },
      { id: "wing-r", label: "Right wing", size: 5, mount: "gimbal" },
    ],
    components: [
      { id: "shield", label: "Shield", category: "shield", size: 2 },
      { id: "power", label: "Power plant", category: "powerplant", size: 2 },
      { id: "cooler", label: "Cooler", category: "cooler", size: 2 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 2 },
    ],
  },
  {
    shipName: "Gladius",
    manufacturer: "Aegis",
    blurb: "Light interceptor. Fast, agile, glass cannon. 2×S3 wings + 2×S2 underwing.",
    hardpoints: [
      { id: "wing-l", label: "Left wing", size: 3, mount: "gimbal" },
      { id: "wing-r", label: "Right wing", size: 3, mount: "gimbal" },
      { id: "underwing-l", label: "Left underwing", size: 2, mount: "fixed" },
      { id: "underwing-r", label: "Right underwing", size: 2, mount: "fixed" },
    ],
    components: [
      { id: "shield", label: "Shield", category: "shield", size: 1 },
      { id: "power", label: "Power plant", category: "powerplant", size: 1 },
      { id: "cooler", label: "Cooler", category: "cooler", size: 1 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 2 },
    ],
  },
  {
    shipName: "Sabre",
    manufacturer: "Aegis",
    blurb: "Stealth fighter. 4×S3 wings — twin pairs of identical guns.",
    hardpoints: [
      { id: "wing-l1", label: "Left wing inner", size: 3, mount: "gimbal" },
      { id: "wing-l2", label: "Left wing outer", size: 3, mount: "gimbal" },
      { id: "wing-r1", label: "Right wing inner", size: 3, mount: "gimbal" },
      { id: "wing-r2", label: "Right wing outer", size: 3, mount: "gimbal" },
    ],
    components: [
      { id: "shield", label: "Shield", category: "shield", size: 2 },
      { id: "power-1", label: "Power plant 1", category: "powerplant", size: 1 },
      { id: "power-2", label: "Power plant 2", category: "powerplant", size: 1 },
      { id: "cooler", label: "Cooler", category: "cooler", size: 1 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 2 },
    ],
  },
  {
    shipName: "Cutlass Black",
    manufacturer: "Drake",
    blurb: "Multipurpose runner. 2×S3 nose + 1×S2 dorsal turret (NPC-manned or remote).",
    hardpoints: [
      { id: "nose-l", label: "Nose left", size: 3, mount: "fixed" },
      { id: "nose-r", label: "Nose right", size: 3, mount: "fixed" },
      { id: "turret", label: "Dorsal turret", size: 2, mount: "turret" },
    ],
    components: [
      { id: "shield-1", label: "Shield 1", category: "shield", size: 1 },
      { id: "shield-2", label: "Shield 2", category: "shield", size: 1 },
      { id: "power", label: "Power plant", category: "powerplant", size: 2 },
      { id: "cooler", label: "Cooler", category: "cooler", size: 2 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 2 },
    ],
  },
  {
    shipName: "Cutlass Steel",
    manufacturer: "Drake",
    blurb: "Military Cutlass — larger nose gun + chin turret + door guns.",
    hardpoints: [
      { id: "nose", label: "Nose", size: 5, mount: "fixed" },
      { id: "wing-l", label: "Left wing", size: 4, mount: "fixed" },
      { id: "wing-r", label: "Right wing", size: 4, mount: "fixed" },
      { id: "chin", label: "Chin turret", size: 3, mount: "turret" },
    ],
    components: [
      { id: "shield", label: "Shield", category: "shield", size: 3 },
      { id: "power", label: "Power plant", category: "powerplant", size: 2 },
      { id: "cooler", label: "Cooler", category: "cooler", size: 2 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 3 },
    ],
  },
  {
    shipName: "Avenger Titan",
    manufacturer: "Aegis",
    blurb: "Starter / cargo runner. 1×S3 nose + 2×S2 wing — punchy for its size.",
    hardpoints: [
      { id: "nose", label: "Nose", size: 3, mount: "fixed" },
      { id: "wing-l", label: "Left wing", size: 2, mount: "fixed" },
      { id: "wing-r", label: "Right wing", size: 2, mount: "fixed" },
    ],
    components: [
      { id: "shield", label: "Shield", category: "shield", size: 1 },
      { id: "power", label: "Power plant", category: "powerplant", size: 1 },
      { id: "cooler", label: "Cooler", category: "cooler", size: 1 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 2 },
    ],
  },
  {
    shipName: "Aurora LN",
    manufacturer: "RSI",
    blurb: "Starter combat. 2×S2 wings — best-in-class price-to-DPS ratio.",
    hardpoints: [
      { id: "wing-l", label: "Left wing", size: 2, mount: "fixed" },
      { id: "wing-r", label: "Right wing", size: 2, mount: "fixed" },
    ],
    components: [
      { id: "shield", label: "Shield", category: "shield", size: 1 },
      { id: "power", label: "Power plant", category: "powerplant", size: 1 },
      { id: "cooler", label: "Cooler", category: "cooler", size: 1 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 1 },
    ],
  },
  {
    shipName: "Vanguard Warden",
    manufacturer: "Aegis",
    blurb: "Heavy fighter. 1×S5 nose + 2×S4 wings + 1×S5 ball turret.",
    hardpoints: [
      { id: "nose", label: "Nose", size: 5, mount: "fixed" },
      { id: "wing-l", label: "Left wing", size: 4, mount: "gimbal" },
      { id: "wing-r", label: "Right wing", size: 4, mount: "gimbal" },
      { id: "ball-turret", label: "Ball turret", size: 5, mount: "turret" },
    ],
    components: [
      { id: "shield", label: "Shield", category: "shield", size: 2 },
      { id: "power", label: "Power plant", category: "powerplant", size: 2 },
      { id: "cooler", label: "Cooler", category: "cooler", size: 2 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 3 },
    ],
  },
  {
    shipName: "Constellation Andromeda",
    manufacturer: "RSI",
    blurb: "Multicrew gunship. 4×S5 nose-fixed + 2×S5 manned turrets.",
    hardpoints: [
      { id: "nose-1", label: "Nose 1", size: 5, mount: "fixed" },
      { id: "nose-2", label: "Nose 2", size: 5, mount: "fixed" },
      { id: "nose-3", label: "Nose 3", size: 5, mount: "fixed" },
      { id: "nose-4", label: "Nose 4", size: 5, mount: "fixed" },
      { id: "top-turret-1", label: "Top turret L", size: 5, mount: "turret" },
      { id: "top-turret-2", label: "Top turret R", size: 5, mount: "turret" },
    ],
    components: [
      { id: "shield-1", label: "Shield 1", category: "shield", size: 3 },
      { id: "shield-2", label: "Shield 2", category: "shield", size: 3 },
      { id: "power-1", label: "Power plant 1", category: "powerplant", size: 2 },
      { id: "power-2", label: "Power plant 2", category: "powerplant", size: 2 },
      { id: "cooler-1", label: "Cooler 1", category: "cooler", size: 3 },
      { id: "cooler-2", label: "Cooler 2", category: "cooler", size: 3 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 4 },
    ],
  },
  {
    shipName: "Freelancer MAX",
    manufacturer: "MISC",
    blurb: "Cargo hauler with teeth. 2×S2 nose + 4×S3 manned turrets.",
    hardpoints: [
      { id: "nose-l", label: "Nose left", size: 2, mount: "fixed" },
      { id: "nose-r", label: "Nose right", size: 2, mount: "fixed" },
      { id: "turret-1", label: "Turret 1", size: 3, mount: "turret" },
      { id: "turret-2", label: "Turret 2", size: 3, mount: "turret" },
    ],
    components: [
      { id: "shield-1", label: "Shield 1", category: "shield", size: 2 },
      { id: "shield-2", label: "Shield 2", category: "shield", size: 2 },
      { id: "power", label: "Power plant", category: "powerplant", size: 2 },
      { id: "cooler", label: "Cooler", category: "cooler", size: 2 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 3 },
    ],
  },
  {
    shipName: "Buccaneer",
    manufacturer: "Drake",
    blurb: "Glass-cannon brawler. 1×S4 nose + 2×S3 wings + 2×S1 nose-secondary.",
    hardpoints: [
      { id: "nose", label: "Nose", size: 4, mount: "fixed" },
      { id: "wing-l", label: "Left wing", size: 3, mount: "fixed" },
      { id: "wing-r", label: "Right wing", size: 3, mount: "fixed" },
    ],
    components: [
      { id: "shield", label: "Shield", category: "shield", size: 1 },
      { id: "power", label: "Power plant", category: "powerplant", size: 1 },
      { id: "cooler", label: "Cooler", category: "cooler", size: 1 },
      { id: "quantum", label: "Quantum drive", category: "quantum", size: 2 },
    ],
  },
];

export function shipDefByName(name: string): ShipLoadoutDef | null {
  const lower = name.trim().toLowerCase();
  return SHIP_HARDPOINTS.find((s) => s.shipName.toLowerCase() === lower) ?? null;
}

/** Ship def as stored in the ships.ship_loadout column (populated by
 *  scripts/ingest-ship-loadouts.mjs). Includes manufacturer/blurb
 *  re-derived from the joined ships row at fetch time. */
export interface DbShipDef extends ShipLoadoutDef {
  shipId: string;
}

/** Pull every ship that has a ship_loadout populated. Used by the
 *  /meta-loadouts picker to surface every flyable hull (not just the
 *  hand-curated SHIP_HARDPOINTS). */
export async function fetchAllShipDefs(): Promise<DbShipDef[]> {
  const client = createClient();
  const PAGE = 500;
  const out: DbShipDef[] = [];
  for (let from = 0; ; from += PAGE) {
    // Project hull/armor straight out of source_data via PostgREST jsonb
    // arrows so we don't have to round-trip the full giant blob.
    const { data, error } = await client
      .from("ships")
      .select(
        [
          "id",
          "name",
          "manufacturer",
          "role",
          "ship_loadout",
          "hull_hp:source_data->>health",
          "armor_hp:source_data->armor->>health",
          "shield_hp:source_data->shield->>hp",
          "resist_energy:source_data->armor->damage_multipliers->>energy",
          "resist_physical:source_data->armor->damage_multipliers->>physical",
          "resist_thermal:source_data->armor->damage_multipliers->>thermal",
          "resist_distortion:source_data->armor->damage_multipliers->>distortion",
        ].join(","),
      )
      .not("ship_loadout", "is", null)
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as Array<{
      id: string;
      name: string;
      manufacturer: string | null;
      role: string | null;
      ship_loadout: { hardpoints?: Hardpoint[]; components?: ComponentSlot[] } | null;
      hull_hp: string | null;
      armor_hp: string | null;
      shield_hp: string | null;
      resist_energy: string | null;
      resist_physical: string | null;
      resist_thermal: string | null;
      resist_distortion: string | null;
    }>;
    const toNum = (s: string | null): number | null => {
      if (s == null) return null;
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : null;
    };
    for (const r of rows) {
      const ld = r.ship_loadout ?? {};
      const hardpoints = (ld.hardpoints ?? []).filter(
        (h) => h.size >= 1 && h.size <= 9,
      );
      const components = (ld.components ?? []).filter(
        (c) => c.size >= 1 && c.size <= 9,
      );
      // Skip ships with NO interesting slots (NPC ships, internal-only
      // ports). They're not useful for the picker.
      if (hardpoints.length === 0 && components.length === 0) continue;
      out.push({
        shipId: r.id,
        shipName: r.name,
        manufacturer: r.manufacturer ?? "Unknown",
        blurb: r.role ?? "",
        hardpoints,
        components,
        durability: {
          hullHp: toNum(r.hull_hp),
          armorHp: toNum(r.armor_hp),
          factoryShieldHp: toNum(r.shield_hp),
          resists: {
            energy: toNum(r.resist_energy),
            physical: toNum(r.resist_physical),
            thermal: toNum(r.resist_thermal),
            distortion: toNum(r.resist_distortion),
          },
        },
      });
    }
    if (rows.length < PAGE) break;
  }
  // Dedupe — the ships table has occasional literal duplicates (same
  // name, different ids) from multi-pass ingest. Keep the first seen
  // for each (lowercased) name so the leaderboard / picker doesn't
  // show the same ship 4× and React doesn't get key collisions.
  const seen = new Set<string>();
  const deduped: DbShipDef[] = [];
  for (const s of out) {
    const k = s.shipName.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(s);
  }
  return deduped;
}

// ── WEAPON STAT EXTRACTION ───────────────────────────────────────────

export interface WeaponStats {
  name: string;
  size: number;
  manufacturer: string | null;
  /** "ballistic", "energy", "distortion", or "unknown". Drives shield/armor matchups. */
  damageType: "ballistic" | "energy" | "distortion" | "unknown";
  /** Damage per shot (sum across all damage subtypes). */
  alpha: number | null;
  /** Rounds per minute. */
  fireRate: number | null;
  /** Calculated alpha × fireRate / 60. */
  dps: number | null;
  /** m/s, useful for range scoring. */
  projectileSpeed: number | null;
  /** Mount type the weapon supports (fixed, gimbal, turret-mounted). */
  mountKind: "fixed" | "gimbal" | "turret" | "any";
  /** Marketing blurb from stdItem.DescriptionText — shown on hover. */
  description: string | null;
  /** Item Type / Class / Grade etc. for hover panel. */
  meta: Record<string, string>;
}

function num(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = parseFloat(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Recursively search the entire source_data tree for keys matching a
 *  predicate. scunpacked's schema for ship weapons varies between
 *  weapon kinds and dump versions — rather than trying to hardcode
 *  every path, we walk the tree once and pull the first numeric value
 *  whose key matches. Stops at first hit (depth-first). */
function findFirstNumber(
  root: unknown,
  matchKey: (key: string) => boolean,
  maxDepth = 10,
): number | null {
  if (root == null || maxDepth < 0) return null;
  if (Array.isArray(root)) {
    for (const v of root) {
      const r = findFirstNumber(v, matchKey, maxDepth - 1);
      if (r != null) return r;
    }
    return null;
  }
  if (typeof root !== "object") return null;
  for (const [k, v] of Object.entries(root as Record<string, unknown>)) {
    if (matchKey(k)) {
      const n = num(v);
      if (n != null && n > 0) return n;
    }
  }
  for (const v of Object.values(root as Record<string, unknown>)) {
    const r = findFirstNumber(v, matchKey, maxDepth - 1);
    if (r != null) return r;
  }
  return null;
}

/** Sum of all matching numeric keys at any depth — for damage that's
 *  split across multiple subtypes (physical + energy + thermal etc). */
function sumAllNumbers(
  root: unknown,
  matchKey: (key: string) => boolean,
  maxDepth = 10,
): number {
  let total = 0;
  function walk(node: unknown, depth: number) {
    if (node == null || depth < 0) return;
    if (Array.isArray(node)) {
      for (const v of node) walk(v, depth - 1);
      return;
    }
    if (typeof node !== "object") return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (matchKey(k)) {
        const n = num(v);
        if (n != null && n > 0) total += n;
      } else {
        walk(v, depth - 1);
      }
    }
  }
  walk(root, maxDepth);
  return total;
}

/** Walk the tree and sum DamageValue entries grouped by their sibling
 *  DamageType. scunpacked's ship-weapon schema stores damage as an array
 *  of `{ DamageType: "DAMAGE_TYPE_PHYSICAL", DamageValue: 35 }` objects
 *  rather than per-type keys. This pulls from that shape. */
function sumDamageByType(root: unknown): {
  physical: number;
  energy: number;
  distortion: number;
  bio: number;
  thermal: number;
} {
  const out = { physical: 0, energy: 0, distortion: 0, bio: 0, thermal: 0 };
  function walk(node: unknown, depth: number) {
    if (node == null || depth < 0) return;
    if (Array.isArray(node)) {
      for (const v of node) walk(v, depth - 1);
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const dt = obj.DamageType ?? obj.damageType ?? obj.type;
    const dv = num(obj.DamageValue ?? obj.damageValue ?? obj.value ?? obj.amount);
    if (typeof dt === "string" && dv != null && dv > 0) {
      const t = dt.toLowerCase();
      if (t.includes("physical") || t.includes("kinetic")) out.physical += dv;
      else if (t.includes("energy")) out.energy += dv;
      else if (t.includes("distortion")) out.distortion += dv;
      else if (t.includes("thermal")) out.thermal += dv;
      else if (t.includes("bio")) out.bio += dv;
    }
    for (const v of Object.values(obj)) walk(v, depth - 1);
  }
  walk(root, 12);
  return out;
}

/** Extract combat stats from a weapon's source_data jsonb.
 *  scunpacked already pre-computes DPS / alpha / per-type damage in the
 *  stdItem.Weapon.Damage block, so we read those directly first. Falls
 *  back to deep-search heuristics for older / non-standard weapon dumps. */
export function extractWeaponStats(w: Item): WeaponStats {
  const sd: unknown = w.source_data ?? {};
  const sdAny = sd as Record<string, unknown>;
  const stdItem = (sdAny.stdItem ?? sdAny) as Record<string, unknown>;
  const weapon = (stdItem.Weapon ?? null) as Record<string, unknown> | null;
  const damage = (weapon?.Damage ?? null) as
    | { Dps?: Record<string, number>; Alpha?: Record<string, number>; DpsTotal?: number; AlphaTotal?: number }
    | null;

  // Primary path: stdItem.Weapon.Damage already has totals + per-type.
  let dmgPhys = num(damage?.Dps?.Physical) ?? 0;
  let dmgEnergy = (num(damage?.Dps?.Energy) ?? 0) + (num(damage?.Dps?.Thermal) ?? 0);
  let dmgDist = num(damage?.Dps?.Distortion) ?? 0;
  let alphaPhys = num(damage?.Alpha?.Physical) ?? 0;
  let alphaEnergy = (num(damage?.Alpha?.Energy) ?? 0) + (num(damage?.Alpha?.Thermal) ?? 0);
  let alphaDist = num(damage?.Alpha?.Distortion) ?? 0;
  let alpha = num(damage?.AlphaTotal) ?? (alphaPhys + alphaEnergy + alphaDist || null);
  let dps = num(damage?.DpsTotal) ?? (dmgPhys + dmgEnergy + dmgDist || null);

  // Fallback path: walk the tree for older shapes when stdItem.Weapon
  // isn't present (some defensive guns / turrets in older dumps).
  if (alpha == null) {
    const byType = sumDamageByType(sd);
    dmgPhys = byType.physical;
    dmgEnergy = byType.energy + byType.thermal;
    dmgDist = byType.distortion;
    if (dmgPhys + dmgEnergy + dmgDist === 0) {
      dmgPhys = sumAllNumbers(sd, (k) => /^damage(Physical|Kinetic)$/i.test(k));
      dmgEnergy = sumAllNumbers(sd, (k) => /^damage(Energy|Thermal)$/i.test(k));
      dmgDist = sumAllNumbers(sd, (k) => /^damageDistortion$/i.test(k));
    }
    const totalDamage = dmgPhys + dmgEnergy + dmgDist;
    if (totalDamage > 0) alpha = totalDamage;
  }

  // Fire rate — RateOfFire is the canonical key in stdItem.Weapon.
  let fireRate = num(weapon?.RateOfFire);
  if (fireRate == null) {
    fireRate = findFirstNumber(sd, (k) =>
      /^(RoundsPerMinute|RateOfFire|FireRate|RPM|FireFrequency|CycleTime)$/i.test(k),
    );
    if (fireRate != null && fireRate < 50) fireRate = fireRate * 60; // Hz → RPM
  }

  // Compute DPS from alpha × fireRate if not already provided.
  if (dps == null && alpha != null && fireRate != null) {
    dps = (alpha * fireRate) / 60;
  }

  // Projectile speed — stdItem.Ammunition.Speed is canonical.
  const ammunition = stdItem.Ammunition as Record<string, unknown> | undefined;
  const projectileSpeed =
    num(ammunition?.Speed) ??
    findFirstNumber(sd, (k) => /^(Speed|MuzzleVelocity|ProjectileVelocity)$/i.test(k));

  // Damage type — pick the dominant subtype from the Damage block.
  let damageType: WeaponStats["damageType"] = "unknown";
  const maxAlpha = Math.max(alphaPhys || dmgPhys, alphaEnergy || dmgEnergy, alphaDist || dmgDist);
  if (maxAlpha > 0) {
    if ((alphaPhys || dmgPhys) === maxAlpha) damageType = "ballistic";
    else if ((alphaEnergy || dmgEnergy) === maxAlpha) damageType = "energy";
    else damageType = "distortion";
  } else if (typeof w.classification === "string") {
    const c = w.classification.toLowerCase();
    if (c.includes("ballistic") || c.includes("kinetic")) damageType = "ballistic";
    else if (c.includes("energy") || c.includes("laser") || c.includes("plasma") || c.includes("neutron")) damageType = "energy";
    else if (c.includes("distortion")) damageType = "distortion";
  }
  if (damageType === "unknown") {
    // Tags are reliable when present — VNCL guns are tagged NeutronCannon etc.
    const tagsLower = ((typeof w.tags === "string" ? w.tags : "") + " " + (Array.isArray(stdItem.Tags) ? (stdItem.Tags as string[]).join(" ") : "")).toLowerCase();
    if (/ballistic|gatling|repeater|kinetic|cannon[^a-z]/i.test(tagsLower)) damageType = "ballistic";
    if (/laser|plasma|neutron|distortion|disruptor|tachyon/i.test(tagsLower)) damageType = "energy";
  }

  // Mount kind — scunpacked sometimes puts this in tags.
  const tags = (typeof w.tags === "string" ? w.tags : "").toLowerCase();
  let mountKind: WeaponStats["mountKind"] = "any";
  if (tags.includes("fixed")) mountKind = "fixed";
  else if (tags.includes("gimbal")) mountKind = "gimbal";
  else if (tags.includes("turret")) mountKind = "turret";

  // Size — prefer the column, fall back to source_data.stdItem.Size
  // since the column was projected at ingest time and may be null for
  // some rows.
  let size = w.size ?? 0;
  if (size === 0) {
    const sdSize = findFirstNumber(sd, (k) => k === "Size", 4);
    if (sdSize != null) size = Math.round(sdSize);
  }

  // Hover-info: short blurb + structured meta (Item Type, Grade, Class).
  const description = typeof stdItem.DescriptionText === "string" ? (stdItem.DescriptionText as string) : null;
  const dd = (stdItem.DescriptionData as Record<string, string> | undefined) ?? {};
  const meta: Record<string, string> = {};
  for (const k of ["Item Type", "Manufacturer", "Size", "Grade", "Class"]) {
    if (typeof dd[k] === "string" && dd[k]) meta[k] = dd[k];
  }

  return {
    name: w.name,
    size,
    manufacturer: w.manufacturer,
    damageType,
    alpha,
    fireRate,
    dps,
    projectileSpeed,
    mountKind,
    description,
    meta,
  };
}

/** Walk ResourceNetwork.States[].Deltas[] and sum the Rate of every
 *  Delta whose Type=="Generation" and Resource matches the given
 *  resource name. Used as a fallback when ResourceNetwork.Generation
 *  doesn't have the expected field directly. */
function sumGenerationByType(root: unknown, resource: string): number {
  let total = 0;
  function walk(node: unknown, depth: number) {
    if (node == null || depth < 0) return;
    if (Array.isArray(node)) {
      for (const v of node) walk(v, depth - 1);
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (
      obj.Type === "Generation" &&
      typeof obj.Resource === "string" &&
      obj.Resource.toLowerCase() === resource.toLowerCase()
    ) {
      const r = num(obj.Rate);
      if (r != null) total += r;
    }
    for (const v of Object.values(obj)) walk(v, depth - 1);
  }
  walk(root, 12);
  return total;
}

// ── COMPONENT EXTRACTION ─────────────────────────────────────────────

export interface ComponentStats {
  name: string;
  size: number;
  manufacturer: string | null;
  category: ComponentCategory;
  /** Headline value used for ranking — meaning depends on category:
   *  - shield: max HP
   *  - powerplant: power output
   *  - cooler: cooling rate
   *  - quantum: jump range (km)  */
  primary: number | null;
  /** Secondary value shown alongside the primary (regen, etc.). */
  secondary: number | null;
  primaryLabel: string;
  secondaryLabel: string;
  description: string | null;
  meta: Record<string, string>;
}

/** Classify a component into our category enum based on its scunpacked
 *  Type field (e.g. "Shield" / "PowerPlant" / "Cooler" / "QuantumDrive"). */
export function categorizeComponent(item: Item): ComponentCategory | null {
  const t = (item.type ?? "").toLowerCase();
  if (t.includes("shield")) return "shield";
  if (t.includes("powerplant") || t === "powerplant") return "powerplant";
  if (t.includes("cooler")) return "cooler";
  if (t.includes("quantum")) return "quantum";
  return null;
}

export function extractComponentStats(item: Item, category: ComponentCategory): ComponentStats {
  const sd: unknown = item.source_data ?? {};
  const sdAny = sd as Record<string, unknown>;
  const stdItem = (sdAny.stdItem ?? sdAny) as Record<string, unknown>;

  let primary: number | null = null;
  let secondary: number | null = null;
  let primaryLabel = "Stat";
  let secondaryLabel = "—";

  if (category === "shield") {
    // Shield block: stdItem.Shield.MaxShieldHealth + RegenerationRate.
    const shield = stdItem.Shield as Record<string, unknown> | undefined;
    primary =
      num(shield?.MaxShieldHealth) ??
      findFirstNumber(sd, (k) => /^(MaxShieldHealth|MaxHealth|ShieldPoints|HitPoints)$/i.test(k));
    secondary =
      num(shield?.RegenerationRate) ??
      findFirstNumber(sd, (k) => /^(RegenerationRate|RegenRate|Regen)$/i.test(k));
    primaryLabel = "Max HP";
    secondaryLabel = "Regen/s";
  } else if (category === "powerplant") {
    // Power plant output lives in stdItem.ResourceNetwork.Generation.Power
    // (it's the same value also reflected in States[0].Deltas where
    // Type="Generation" — but Generation.Power is the cleanest path).
    // EM signature comes from stdItem.Emission.Em.Maximum.
    const network = stdItem.ResourceNetwork as Record<string, unknown> | undefined;
    const generation = network?.Generation as Record<string, unknown> | undefined;
    primary = num(generation?.Power);
    if (primary == null) {
      primary = sumGenerationByType(sd, "Power");
    }
    const emission = stdItem.Emission as Record<string, unknown> | undefined;
    const em = emission?.Em as Record<string, unknown> | undefined;
    secondary = num(em?.Maximum);
    primaryLabel = "Output";
    secondaryLabel = "EM sig";
  } else if (category === "cooler") {
    // Coolers follow the same ResourceNetwork.Generation pattern but
    // generate "Coolant" instead of "Power".
    const network = stdItem.ResourceNetwork as Record<string, unknown> | undefined;
    const generation = network?.Generation as Record<string, unknown> | undefined;
    primary = num(generation?.Coolant) ?? num(generation?.Cooling);
    if (primary == null) {
      primary = sumGenerationByType(sd, "Coolant") || sumGenerationByType(sd, "Cooling");
      if (primary === 0) primary = null;
    }
    // IR sig — if present.
    const emission = stdItem.Emission as Record<string, unknown> | undefined;
    secondary = num(emission?.Ir);
    primaryLabel = "Cooling";
    secondaryLabel = "IR sig";
  } else if (category === "quantum") {
    // Quantum drive: stdItem.QuantumDrive has the live block. Look for
    // JumpRange, DriveSpeed (m/s during jump), and SpoolUpTime.
    const q = stdItem.QuantumDrive as Record<string, unknown> | undefined;
    primary =
      num(q?.JumpRange) ??
      num(q?.MaxRange) ??
      // QuantumDrive in newer dumps puts the range under .Performance or similar
      findFirstNumber(sd, (k) => /^(JumpRange|MaxRange)$/i.test(k));
    // Sentinel guard.
    if (primary != null && primary > 1e15) primary = null;
    // Range stored in m by some dumps — convert to km.
    if (primary != null && primary > 100_000_000) primary = primary / 1000;
    secondary =
      num(q?.DriveSpeed) ??
      num(q?.QuantumSpeed) ??
      findFirstNumber(sd, (k) => /^(DriveSpeed|QuantumSpeed)$/i.test(k));
    if (secondary != null && secondary > 1e15) secondary = null;
    primaryLabel = "Range";
    secondaryLabel = "Speed";
  }

  // Hover-info — same shape as weapons.
  const description = typeof stdItem.DescriptionText === "string" ? (stdItem.DescriptionText as string) : null;
  const dd = (stdItem.DescriptionData as Record<string, string> | undefined) ?? {};
  const meta: Record<string, string> = {};
  for (const k of ["Item Type", "Manufacturer", "Size", "Grade", "Class"]) {
    if (typeof dd[k] === "string" && dd[k]) meta[k] = dd[k];
  }

  return {
    name: item.name,
    size: item.size ?? 0,
    manufacturer: item.manufacturer,
    category,
    primary,
    secondary,
    primaryLabel,
    secondaryLabel,
    description,
    meta,
  };
}

// Fetch all components with source_data jsonb, classified into our four
// categories. One round-trip, all sizes.
export async function fetchComponentCandidates(): Promise<Map<ComponentCategory, ComponentStats[]>> {
  const client = createClient();
  const PAGE = 1000;
  const out = new Map<ComponentCategory, ComponentStats[]>([
    ["shield", []],
    ["powerplant", []],
    ["cooler", []],
    ["quantum", []],
  ]);
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("components")
      .select("id, class_name, name, manufacturer, type, subtype, classification, grade, size, tags, source_data")
      .gte("size", 1)
      .lte("size", 9)
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Item[];
    for (const r of rows) {
      const cat = categorizeComponent(r);
      if (!cat) continue;
      out.get(cat)!.push(extractComponentStats(r, cat));
    }
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Pick the best component for a slot — highest primary stat that fits
 *  the slot's size. */
export function pickBestComponent(
  slot: ComponentSlot,
  candidates: ComponentStats[],
): { component: ComponentStats | null; reason?: string } {
  const sized = candidates.filter((c) => c.size === slot.size);
  if (sized.length === 0) return { component: null, reason: `No size-${slot.size} ${slot.category} in catalog` };
  const ranked = sized
    .map((c) => ({ c, p: c.primary ?? -Infinity }))
    .sort((a, b) => b.p - a.p);
  if (!Number.isFinite(ranked[0].p)) {
    return {
      component: ranked[0].c,
      reason: "Stats unavailable — picked first size match",
    };
  }
  return { component: ranked[0].c };
}

// ── PROFILES + SCORING ───────────────────────────────────────────────

export type ProfileKey = "max_dps" | "max_alpha" | "balanced" | "ballistic" | "energy" | "long_range" | "tank";

export interface ProfileDef {
  key: ProfileKey;
  label: string;
  emoji: string;
  blurb: string;
  /** Higher = better. Returns -Infinity for disqualifying conditions. */
  score: (s: WeaponStats) => number;
}

export const PROFILES: ProfileDef[] = [
  {
    key: "max_dps",
    label: "Max DPS",
    emoji: "🔥",
    blurb: "Highest sustained damage per second across every slot. The honest 'big number'.",
    score: (s) => s.dps ?? -Infinity,
  },
  {
    key: "max_alpha",
    label: "Max Alpha",
    emoji: "💥",
    blurb: "Biggest single-shot punch. Best for one-and-done assassinations from stealth.",
    score: (s) => s.alpha ?? -Infinity,
  },
  {
    key: "balanced",
    label: "Balanced",
    emoji: "⚖",
    blurb: "DPS × projectile speed — a hit you can't land doesn't count.",
    score: (s) =>
      s.dps != null && s.projectileSpeed != null
        ? s.dps * (s.projectileSpeed / 1000)
        : (s.dps ?? -Infinity),
  },
  {
    key: "ballistic",
    label: "Ballistic-Only",
    emoji: "🔫",
    blurb: "Bypass shields by hitting hull directly. Limited ammo — burst fights only.",
    score: (s) => (s.damageType === "ballistic" ? (s.dps ?? 0) : -Infinity),
  },
  {
    key: "energy",
    label: "Energy-Only",
    emoji: "⚡",
    blurb: "Infinite ammo, eats shields. Heat management matters in long fights.",
    score: (s) => (s.damageType === "energy" ? (s.dps ?? 0) : -Infinity),
  },
  {
    key: "long_range",
    label: "Long Range",
    emoji: "🎯",
    blurb: "Picks weapons with the highest projectile speed for kiting / stand-off duels.",
    score: (s) => s.projectileSpeed ?? -Infinity,
  },
  {
    key: "tank",
    label: "Tank",
    emoji: "🛡",
    blurb: "Built to soak hits and outlast. Favors fast projectiles + sustained DPS so you can trade at range while your shield/hull/armor wins the attrition fight. Pair with a tanky hull (high EHP vs Energy).",
    // Projectile speed dominates so shots actually connect during a
    // kite-and-tank exchange; DPS tiebreaks for sustained pressure.
    // Weapons with no projectile-speed data fall back to pure DPS so the
    // slot still fills with something useful.
    score: (s) => {
      if (s.projectileSpeed != null && s.dps != null) {
        return s.projectileSpeed * 1000 + s.dps;
      }
      return s.dps ?? -Infinity;
    },
  },
];

// ── LOADOUT COMPUTATION ──────────────────────────────────────────────

export interface LoadoutSlot {
  hardpoint: Hardpoint;
  weapon: WeaponStats | null;
  /** Set when no compatible weapon was found in the catalog. */
  reason?: string;
}

export interface ComponentChoice {
  slot: ComponentSlot;
  component: ComponentStats | null;
  reason?: string;
}

export interface LoadoutResult {
  ship: ShipLoadoutDef;
  profile: ProfileDef;
  slots: LoadoutSlot[];
  components: ComponentChoice[];
  // Aggregate stats across ALL slots that had a weapon assigned.
  totals: {
    dps: number;
    alpha: number;
    /** Number of hardpoints with a chosen weapon. */
    filled: number;
    /** Total hardpoints the ship has. */
    total: number;
    /** Total shield HP across every shield slot. */
    shieldHp: number;
    /** Hull HP from source_data. */
    hullHp: number;
    /** Armor HP from source_data. */
    armorHp: number;
    /** Effective HP vs energy weapons: shields + (hull / energyResist) +
     *  armor. Higher = harder to kill. */
    ehpEnergy: number;
    /** Effective HP vs ballistics. */
    ehpBallistic: number;
  };
}

/** Effective HP combines shield + (hull / damage-type multiplier) + armor.
 *  Multiplier of 0.6 means the hull effectively has 1.67× HP vs that
 *  damage type. Armor HP is added raw — it's a separate bucket the game
 *  burns through alongside the hull. */
export function effectiveHp(
  shieldHp: number,
  durability: ShipDurability | undefined,
  damageType: "energy" | "physical",
): number {
  const hull = durability?.hullHp ?? 0;
  const armor = durability?.armorHp ?? 0;
  const mult = durability?.resists?.[damageType] ?? 1;
  const safeMult = mult > 0 ? mult : 1;
  return Math.round(shieldHp + hull / safeMult + armor);
}

/** Pick the best-scoring weapon for each hardpoint per the profile.
 *  Strict-size match. Profile decides the score; if no weapon scored
 *  (e.g. all weapons missing DPS data), fall back to picking ANY
 *  size-matched weapon so the slot still shows something useful. */
export function computeLoadout(
  ship: ShipLoadoutDef,
  profile: ProfileDef,
  weapons: WeaponStats[],
  componentsByCategory?: Map<ComponentCategory, ComponentStats[]>,
): LoadoutResult {
  const slots: LoadoutSlot[] = ship.hardpoints.map((hp) => {
    // Step 1: strict size match + class restriction (if any).
    const sizeMatched = weapons.filter((w) => {
      if (w.size !== hp.size) return false;
      if (hp.weaponClass && w.damageType !== hp.weaponClass) return false;
      return true;
    });
    if (sizeMatched.length === 0) {
      return { hardpoint: hp, weapon: null, reason: `No size-${hp.size} weapon in catalog` };
    }
    // Step 2: rank by profile score; finite scores win.
    const scored = sizeMatched
      .map((w) => ({ w, s: profile.score(w) }))
      .filter((x) => Number.isFinite(x.s));
    if (scored.length === 0) {
      // Fallback: profile disqualified everything (e.g. Ballistic-Only on
      // a slot where we have no ballistic stats yet). Pick by alpha or
      // arbitrary first match so the user sees a candidate.
      const fallback = sizeMatched
        .slice()
        .sort((a, b) => (b.alpha ?? 0) - (a.alpha ?? 0))[0];
      return {
        hardpoint: hp,
        weapon: fallback,
        reason: "Profile match weak — showing best size match (stats may be incomplete)",
      };
    }
    scored.sort((a, b) => b.s - a.s);
    return { hardpoint: hp, weapon: scored[0].w };
  });

  const filled = slots.filter((s) => s.weapon).length;
  const totalDps = slots.reduce((acc, s) => acc + (s.weapon?.dps ?? 0), 0);
  const totalAlpha = slots.reduce((acc, s) => acc + (s.weapon?.alpha ?? 0), 0);

  // Components — pick the best per slot from each category.
  const components: ComponentChoice[] = ship.components.map((cs) => {
    const pool = componentsByCategory?.get(cs.category) ?? [];
    const { component, reason } = pickBestComponent(cs, pool);
    return { slot: cs, component, reason };
  });
  const shieldHp = components
    .filter((c) => c.slot.category === "shield")
    .reduce((acc, c) => acc + (c.component?.primary ?? 0), 0);

  // If the ship has no shield slots OR no shield component picked,
  // fall back to the factory shield value baked into source_data.
  const effShieldHp = shieldHp > 0
    ? shieldHp
    : (ship.durability?.factoryShieldHp ?? 0);

  return {
    ship,
    profile,
    slots,
    components,
    totals: {
      dps: Math.round(totalDps),
      alpha: Math.round(totalAlpha),
      filled,
      total: slots.length,
      shieldHp: Math.round(effShieldHp),
      hullHp: Math.round(ship.durability?.hullHp ?? 0),
      armorHp: Math.round(ship.durability?.armorHp ?? 0),
      ehpEnergy: effectiveHp(effShieldHp, ship.durability, "energy"),
      ehpBallistic: effectiveHp(effShieldHp, ship.durability, "physical"),
    },
  };
}
