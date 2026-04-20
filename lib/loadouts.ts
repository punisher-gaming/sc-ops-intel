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

export interface ShipLoadoutDef {
  /** Match against the ships table `name` (case-insensitive). */
  shipName: string;
  /** Manufacturer code or name for display. */
  manufacturer: string;
  /** Short tagline for the meta-loadouts ship picker. */
  blurb: string;
  hardpoints: Hardpoint[];
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
  },
  {
    shipName: "Aurora LN",
    manufacturer: "RSI",
    blurb: "Starter combat. 2×S2 wings — best-in-class price-to-DPS ratio.",
    hardpoints: [
      { id: "wing-l", label: "Left wing", size: 2, mount: "fixed" },
      { id: "wing-r", label: "Right wing", size: 2, mount: "fixed" },
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
  },
];

export function shipDefByName(name: string): ShipLoadoutDef | null {
  const lower = name.trim().toLowerCase();
  return SHIP_HARDPOINTS.find((s) => s.shipName.toLowerCase() === lower) ?? null;
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
 *  Tries three damage shapes (DamageValue arrays, per-type keys, scalar
 *  damage) so we maximize coverage of scunpacked's varied schemas. */
export function extractWeaponStats(w: Item): WeaponStats {
  const sd: unknown = w.source_data ?? {};

  // Shape A: array of {DamageType, DamageValue} entries (most common
  // for ship guns in scunpacked).
  const byType = sumDamageByType(sd);
  let dmgPhys = byType.physical;
  let dmgEnergy = byType.energy + byType.thermal;
  let dmgDist = byType.distortion;
  let dmgBio = byType.bio;

  // Shape B: per-type top-level keys (damagePhysical, damageEnergy, etc.)
  if (dmgPhys + dmgEnergy + dmgDist + dmgBio === 0) {
    dmgPhys = sumAllNumbers(sd, (k) => /^damage(Physical|Kinetic)$/i.test(k));
    dmgEnergy = sumAllNumbers(sd, (k) => /^damage(Energy|Thermal)$/i.test(k));
    dmgDist = sumAllNumbers(sd, (k) => /^damageDistortion$/i.test(k));
    dmgBio = sumAllNumbers(sd, (k) => /^damageBiochemical$/i.test(k));
  }

  // Shape C: scalar fallback — single "damage" or "Damage" number.
  let totalDamage = dmgPhys + dmgEnergy + dmgDist + dmgBio;
  if (totalDamage === 0) {
    const scalar = findFirstNumber(sd, (k) => k === "damage" || k === "Damage");
    if (scalar != null) totalDamage = scalar;
  }
  const alpha = totalDamage > 0 ? totalDamage : null;

  // Fire rate — try every reasonable name. RPM is most common; if the
  // value is small we assume Hz and convert.
  let fireRate = findFirstNumber(sd, (k) =>
    /^(roundsPerMinute|fireRate|rateOfFire|RPM|fireFrequency|cycleTime)$/i.test(k),
  );
  if (fireRate != null && fireRate < 50) fireRate = fireRate * 60; // Hz → RPM

  const dps = alpha != null && fireRate != null ? (alpha * fireRate) / 60 : null;

  // Projectile / muzzle speed
  const projectileSpeed = findFirstNumber(sd, (k) =>
    /^(speed|muzzleVelocity|projectileVelocity)$/i.test(k),
  );

  // Damage type — pick the dominant subtype.
  let damageType: WeaponStats["damageType"] = "unknown";
  const max = Math.max(dmgPhys, dmgEnergy, dmgDist);
  if (max > 0) {
    if (dmgPhys === max) damageType = "ballistic";
    else if (dmgEnergy === max) damageType = "energy";
    else damageType = "distortion";
  } else if (typeof w.classification === "string") {
    const c = w.classification.toLowerCase();
    if (c.includes("ballistic") || c.includes("kinetic")) damageType = "ballistic";
    else if (c.includes("energy") || c.includes("laser") || c.includes("plasma")) damageType = "energy";
    else if (c.includes("distortion")) damageType = "distortion";
  }
  // Belt-and-suspenders: name often carries the type.
  if (damageType === "unknown") {
    const n = (w.name ?? "").toLowerCase();
    if (/(repeater|cannon).*ballistic|gatling|gallant|tarantula|deadbolt|panther/.test(n))
      damageType = "ballistic";
    else if (/laser|plasma|distortion|disruptor/.test(n))
      damageType = "energy";
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
  };
}

// ── PROFILES + SCORING ───────────────────────────────────────────────

export type ProfileKey = "max_dps" | "max_alpha" | "balanced" | "ballistic" | "energy" | "long_range";

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
];

// ── LOADOUT COMPUTATION ──────────────────────────────────────────────

export interface LoadoutSlot {
  hardpoint: Hardpoint;
  weapon: WeaponStats | null;
  /** Set when no compatible weapon was found in the catalog. */
  reason?: string;
}

export interface LoadoutResult {
  ship: ShipLoadoutDef;
  profile: ProfileDef;
  slots: LoadoutSlot[];
  // Aggregate stats across ALL slots that had a weapon assigned.
  totals: {
    dps: number;
    alpha: number;
    /** Number of hardpoints with a chosen weapon. */
    filled: number;
    /** Total hardpoints the ship has. */
    total: number;
  };
}

/** Pick the best-scoring weapon for each hardpoint per the profile.
 *  Strict-size match. Profile decides the score; if no weapon scored
 *  (e.g. all weapons missing DPS data), fall back to picking ANY
 *  size-matched weapon so the slot still shows something useful. */
export function computeLoadout(
  ship: ShipLoadoutDef,
  profile: ProfileDef,
  weapons: WeaponStats[],
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

  return {
    ship,
    profile,
    slots,
    totals: {
      dps: Math.round(totalDps),
      alpha: Math.round(totalAlpha),
      filled,
      total: slots.length,
    },
  };
}
