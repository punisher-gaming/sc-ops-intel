import type { SupabaseClient } from "@supabase/supabase-js";

export async function upsertInBatches<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  rows: T[],
  opts: { onConflict: string; batchSize?: number } = { onConflict: "id" },
): Promise<{ inserted: number; error?: string }> {
  const size = opts.batchSize ?? 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await client
      .from(table)
      .upsert(batch, { onConflict: opts.onConflict });
    if (error) {
      return { inserted, error: `${table} batch ${i}: ${error.message}` };
    }
    inserted += batch.length;
  }
  return { inserted };
}

export async function recordRun(
  client: SupabaseClient,
  source: string,
  result: { ok: boolean; rows?: number; message?: string; gameVersion?: string },
  startedAt: number,
) {
  const durationMs = Date.now() - startedAt;
  try {
    await client.from("ingest_runs").insert({
      source,
      status: result.ok ? "ok" : "error",
      rows_upserted: result.rows ?? null,
      duration_ms: durationMs,
      game_version: result.gameVersion ?? null,
      message: result.message ?? null,
      started_at: new Date(startedAt).toISOString(),
      finished_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[ingest_runs] insert failed:", e);
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
