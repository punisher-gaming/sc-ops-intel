import { createClient } from "./supabase/client";

// Returns the safe display fields for any user (used by /profile?id=…).
// Backed by the public_user_profile(uid) SECURITY DEFINER RPC, which reads
// auth.users.raw_user_meta_data, anon clients can't read auth.users
// directly, so the RPC is the only way to surface a Discord avatar/name
// for a user that hasn't filled in profiles.display_name.

export interface PublicProfile {
  id: string;
  display_name: string | null;
  discord_username: string | null;
  avatar_url: string | null;
  bio: string | null;
  rsi_handle: string | null;
  is_admin: boolean;
  is_moderator: boolean;
}

export async function fetchPublicProfile(uid: string): Promise<PublicProfile | null> {
  const client = createClient();
  const { data, error } = await client.rpc("public_user_profile", { uid });
  if (error) return null;
  const rows = (data ?? []) as PublicProfile[];
  return rows[0] ?? null;
}
