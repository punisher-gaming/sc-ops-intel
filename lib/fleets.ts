import { createClient } from "./supabase/client";

export interface Fleet {
  id: string;
  user_id: string;
  name: string;
  ship_ids: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const COLS = "id, user_id, name, ship_ids, notes, created_at, updated_at";

export async function fetchMyFleets(userId: string): Promise<Fleet[]> {
  const client = createClient();
  const { data, error } = await client
    .from("user_fleets")
    .select(COLS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Fleet[];
}

export async function saveFleet(input: {
  user_id: string;
  name: string;
  ship_ids: string[];
  notes?: string;
}): Promise<Fleet> {
  const client = createClient();
  const { data, error } = await client
    .from("user_fleets")
    .insert({
      user_id: input.user_id,
      name: input.name,
      ship_ids: input.ship_ids,
      notes: input.notes ?? null,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as Fleet;
}

export async function renameFleet(id: string, name: string): Promise<void> {
  const client = createClient();
  const { error } = await client.from("user_fleets").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteFleet(id: string): Promise<void> {
  const client = createClient();
  const { error } = await client.from("user_fleets").delete().eq("id", id);
  if (error) throw error;
}
