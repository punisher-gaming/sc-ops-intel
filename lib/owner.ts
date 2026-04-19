// Single-user "Owner" override. KNERFD (site owner) renders as:
//   - name  always uppercase (KNERFD)
//   - role  "Owner" instead of "Admin"
//
// Centralised here so StaffCredits, AuthorPill (community), and the public
// profile page all produce the same display without scattering the user id
// across components. The check is purely cosmetic — it doesn't grant any
// extra server-side permissions beyond what is_admin already does.

export const OWNER_USER_ID = "11a713da-315d-40cb-8fa7-b092787eea01";

export function isOwner(userId: string | null | undefined): boolean {
  return !!userId && userId === OWNER_USER_ID;
}

// Display transform — use for any name that might be the owner's.
export function displayNameFor(
  userId: string | null | undefined,
  rawName: string | null | undefined,
): string {
  const name = (rawName ?? "").trim() || "user";
  if (isOwner(userId)) return name.toUpperCase();
  return name;
}

// Role label — takes is_admin / is_moderator flags plus the user id. Owner
// wins over admin wins over moderator.
export function roleLabelFor(
  userId: string | null | undefined,
  flags: { is_admin?: boolean | null; is_moderator?: boolean | null },
): "Owner" | "Admin" | "Moderator" | null {
  if (isOwner(userId)) return "Owner";
  if (flags.is_admin) return "Admin";
  if (flags.is_moderator) return "Moderator";
  return null;
}
