// Role label + name display helpers.
//
// Terminology shift (April 2026):
//   DB flag         displayed label
//   is_admin     →  Owner
//   is_moderator →  Admin
//
// The underlying Supabase flags + RLS policies + RPCs still use the old
// names (is_admin / is_moderator) because changing them would be a massive
// schema migration with no functional benefit. We rename at the display
// layer only.
//
// The OWNER_USER_ID special case is kept for the KNERFD uppercase-name
// transform, the site owner's handle always renders in caps regardless
// of how it's stored in Discord or profiles.

export const OWNER_USER_ID = "11a713da-315d-40cb-8fa7-b092787eea01";

export function isOwner(userId: string | null | undefined): boolean {
  return !!userId && userId === OWNER_USER_ID;
}

// Uppercase the site owner's handle; everyone else renders as-stored.
export function displayNameFor(
  userId: string | null | undefined,
  rawName: string | null | undefined,
): string {
  const name = (rawName ?? "").trim() || "user";
  if (isOwner(userId)) return name.toUpperCase();
  return name;
}

// Map the DB role flags to the new display terminology.
// Every is_admin user is an "Owner". Every is_moderator user is an "Admin".
// If both flags are true, Owner wins (more privileged).
export function roleLabelFor(
  _userId: string | null | undefined,
  flags: { is_admin?: boolean | null; is_moderator?: boolean | null },
): "Owner" | "Admin" | null {
  if (flags.is_admin) return "Owner";
  if (flags.is_moderator) return "Admin";
  return null;
}
