import { createClient } from "./supabase/client";

export interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  rsi_handle: string | null;
  discord_username: string | null;
  avatar_url: string | null;
  provider: string | null;
  is_admin: boolean;
  is_moderator: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const client = createClient();
  const { data, error } = await client.rpc("admin_list_users");
  if (error) throw error;
  return (data ?? []) as AdminUserRow[];
}

export async function setUserRole(
  userId: string,
  role: "is_moderator" | "is_admin",
  value: boolean,
): Promise<void> {
  const client = createClient();
  const { error } = await client.rpc("admin_set_role", {
    target_user_id: userId,
    role_name: role,
    value,
  });
  if (error) throw error;
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const client = createClient();
  const { data, error } = await client
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) return false;
  return Boolean((data as { is_admin?: boolean } | null)?.is_admin);
}
