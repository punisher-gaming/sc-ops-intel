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
  // Resolved client-side via chat_authors() RPC (Discord avatar/name lookup)
  uploader_name?: string | null;
  uploader_avatar?: string | null;
}

const COLS =
  "id, title, artist, storage_path, public_url, duration_sec, display_order, enabled, uploaded_by, created_at";

// Public-facing: only enabled tracks, in display order, with uploader info
export async function fetchPublishedTracks(): Promise<MusicTrack[]> {
  const client = createClient();
  const { data, error } = await client
    .from("music_tracks")
    .select(COLS)
    .eq("enabled", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  const tracks = (data ?? []) as MusicTrack[];
  await enrichWithUploaders(tracks);
  return tracks;
}

async function enrichWithUploaders(tracks: MusicTrack[]): Promise<void> {
  const uids = Array.from(
    new Set(tracks.map((t) => t.uploaded_by).filter((u): u is string => !!u)),
  );
  if (uids.length === 0) return;
  const client = createClient();
  // chat_authors() is a SECURITY DEFINER RPC that joins profiles + auth.users
  // metadata. Same helper used by the community thread cards.
  const { data, error } = await client.rpc("chat_authors", { uids });
  if (error || !data) return;
  const map = new Map<
    string,
    { display_name: string | null; avatar_url: string | null }
  >();
  for (const a of data as Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  }>) {
    map.set(a.id, { display_name: a.display_name, avatar_url: a.avatar_url });
  }
  for (const t of tracks) {
    if (t.uploaded_by) {
      const a = map.get(t.uploaded_by);
      t.uploader_name = a?.display_name ?? null;
      t.uploader_avatar = a?.avatar_url ?? null;
    }
  }
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

  // Storage path, timestamp-prefixed to avoid collisions
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
  // Best-effort storage cleanup, ignore errors (file might already be gone)
  await client.storage.from("music").remove([storagePath]).catch(() => {});
  const { error } = await client.from("music_tracks").delete().eq("id", id);
  if (error) throw error;
}
