import { createClient } from "./supabase/client";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string | null;
  storage_path: string;
  public_url: string;
  duration_sec: number | null;
  display_order: number;
  enabled: boolean;
  uploaded_by: string | null;
  created_at: string;
}

const COLS =
  "id, title, artist, storage_path, public_url, duration_sec, display_order, enabled, uploaded_by, created_at";

// Public-facing: only enabled tracks, in display order
export async function fetchPublishedTracks(): Promise<MusicTrack[]> {
  const client = createClient();
  const { data, error } = await client
    .from("music_tracks")
    .select(COLS)
    .eq("enabled", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MusicTrack[];
}

// Admin-facing: all tracks regardless of enabled flag
export async function fetchAllTracks(): Promise<MusicTrack[]> {
  const client = createClient();
  const { data, error } = await client
    .from("music_tracks")
    .select(COLS)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MusicTrack[];
}

export async function uploadTrack(
  file: File,
  metadata: { title: string; artist?: string },
  userId: string,
): Promise<MusicTrack> {
  const client = createClient();

  // Storage path — timestamp-prefixed to avoid collisions
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}_${safe}`;

  const { error: upErr } = await client.storage
    .from("music")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "audio/mpeg",
    });
  if (upErr) throw upErr;

  const { data: urlData } = client.storage.from("music").getPublicUrl(path);

  const { data, error } = await client
    .from("music_tracks")
    .insert({
      title: metadata.title,
      artist: metadata.artist ?? null,
      storage_path: path,
      public_url: urlData.publicUrl,
      uploaded_by: userId,
      enabled: true,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as MusicTrack;
}

export async function setTrackEnabled(id: string, enabled: boolean): Promise<void> {
  const client = createClient();
  const { error } = await client.from("music_tracks").update({ enabled }).eq("id", id);
  if (error) throw error;
}

export async function setTrackOrder(id: string, order: number): Promise<void> {
  const client = createClient();
  const { error } = await client
    .from("music_tracks")
    .update({ display_order: order })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTrack(id: string, storagePath: string): Promise<void> {
  const client = createClient();
  // Best-effort storage cleanup — ignore errors (file might already be gone)
  await client.storage.from("music").remove([storagePath]).catch(() => {});
  const { error } = await client.from("music_tracks").delete().eq("id", id);
  if (error) throw error;
}
