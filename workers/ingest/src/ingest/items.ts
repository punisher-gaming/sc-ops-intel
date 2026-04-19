// Ingest weapons + components from scunpacked items.json (~107 MB, LFS).
// Ported from scripts/ingest-items.mjs.
//
// CRITICAL: this file is too big for JSON.parse() in a Cloudflare Worker
// (parsed object graph would blow the 128 MB heap). We stream-parse the
// top-level array, partition each item into weapons / components by Type,
// and upsert in 200-row batches. Memory stays under ~10 MB resident.
//
// Items not matching either WEAPON_TYPES or COMPONENT_TYPES are skipped —
// those are flavour items (Misc, Cargo, Char_*, Display, Door, Seat, paints)
// that don't deserve a top-level catalog page.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../supabase";
import { upsertInBatches, recordRun, nowIso } from "./util";
import { streamJsonArray } from "../stream-json";

const SOURCE =
  "https://media.githubusercontent.com/media/StarCitizenWiki/scunpacked-data/master/items.json";

const WEAPON_TYPES = new Set([
  "WeaponPersonal",
  "WeaponGun",
  "WeaponShip",
  "WeaponDefensive",
  "WeaponAttachment",
  "WeaponMounted",
  "Turret",
]);

const COMPONENT_TYPES = new Set([
  "Cooler",
  "PowerPlant",
  "Shield",
  "ShieldGenerator",
  "QuantumDrive",
  "FuelTank",
  "FuelIntake",
  "QuantumFuelTank",
  "MainThruster",
  "ManneuverThruster",
  "Radar",
  "Computer",
  "FlightController",
  "Scanner",
  "Ping",
  "WeaponRegenPool",
  "MissileLauncher",
  "Missile",
  "EMP",
  "QuantumInterdictionGenerator",
  "TractorBeam",
  "MiningArm",
  "MiningModifier",
  "SalvageModifier",
  "PaintingTool",
]);

interface ScunpackedItem {
  reference: string;
  className?: string;
  name?: string;
  manufacturer?: string;
  type?: string;
  subType?: string;
  classification?: string;
  grade?: number;
  size?: number;
  tags?: string[];
}

function classify(type: string | undefined): "weapons" | "components" | null {
  if (!type) return null;
  if (WEAPON_TYPES.has(type)) return "weapons";
  if (COMPONENT_TYPES.has(type)) return "components";
  if (type.startsWith("Weapon")) return "weapons";
  return null;
}

function buildRow(item: ScunpackedItem, version: string): Record<string, unknown> {
  return {
    id: item.reference,
    class_name: item.className ?? "",
    name:
      item.name && !String(item.name).includes("PLACEHOLDER")
        ? item.name
        : item.className,
    manufacturer: item.manufacturer ?? null,
    type: item.type,
    subtype: item.subType ?? null,
    classification: item.classification ?? null,
    grade: typeof item.grade === "number" ? item.grade : null,
    size: typeof item.size === "number" ? item.size : null,
    tags: item.tags ?? null,
    game_version: version,
    source_data: item,
    last_synced_at: nowIso(),
  };
}

export async function ingestItems(
  client: SupabaseClient,
  env: Env,
  gameVersion?: string,
) {
  const startedAt = Date.now();
  const version = gameVersion ?? env.CURRENT_GAME_VERSION;
  const BATCH = 200;
  try {
    const res = await fetch(SOURCE, {
      headers: { accept: "application/json" },
      // No CF cache — file is 107 MB, blow up the cache budget for nothing
    });
    if (!res.ok) throw new Error(`items.json: HTTP ${res.status}`);

    let weaponsBatch: Record<string, unknown>[] = [];
    let componentsBatch: Record<string, unknown>[] = [];
    let weaponsTotal = 0;
    let componentsTotal = 0;
    let skipped = 0;

    async function flushWeapons() {
      if (weaponsBatch.length === 0) return;
      const r = await upsertInBatches(client, "weapons", weaponsBatch, {
        onConflict: "id",
        batchSize: weaponsBatch.length,
      });
      if (r.error) throw new Error(r.error);
      weaponsTotal += weaponsBatch.length;
      weaponsBatch = [];
    }
    async function flushComponents() {
      if (componentsBatch.length === 0) return;
      const r = await upsertInBatches(client, "components", componentsBatch, {
        onConflict: "id",
        batchSize: componentsBatch.length,
      });
      if (r.error) throw new Error(r.error);
      componentsTotal += componentsBatch.length;
      componentsBatch = [];
    }

    for await (const item of streamJsonArray<ScunpackedItem>(res)) {
      if (!item.reference) {
        skipped += 1;
        continue;
      }
      const dest = classify(item.type);
      if (!dest) {
        skipped += 1;
        continue;
      }
      const row = buildRow(item, version);
      if (dest === "weapons") {
        weaponsBatch.push(row);
        if (weaponsBatch.length >= BATCH) await flushWeapons();
      } else {
        componentsBatch.push(row);
        if (componentsBatch.length >= BATCH) await flushComponents();
      }
    }
    await flushWeapons();
    await flushComponents();

    const result = {
      ok: true,
      weapons: weaponsTotal,
      components: componentsTotal,
      skipped,
      gameVersion: version,
    };
    await recordRun(
      client,
      "scunpacked_items",
      {
        ok: true,
        rows: weaponsTotal + componentsTotal,
        gameVersion: version,
        message: `weapons=${weaponsTotal} components=${componentsTotal} skipped=${skipped}`,
      },
      startedAt,
    );
    return result;
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    await recordRun(
      client,
      "scunpacked_items",
      { ok: false, message: msg, gameVersion: version },
      startedAt,
    );
    return { ok: false, error: msg, gameVersion: version };
  }
}
