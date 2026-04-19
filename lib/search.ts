// Smart search helpers used by every browser + the global ⌘K box + Ask.
//
// The naive `haystack.includes(query)` approach we had before required a
// CONTIGUOUS substring match. Typing "Palatino Daystar" against a real item
// named "Palatino Arms Daystar Helmet" failed because "palatino daystar"
// isn't a substring of "palatino arms daystar helmet" — the words "arms"
// got in the way.
//
// Token matching fixes this: split the query on whitespace and require
// every token to appear *somewhere* in the haystack, in any order. Word
// order doesn't matter, and unrelated middle words ("Arms", "Mk II", etc.)
// don't break the match.

// Normalize for case + accent comparison. NFD splits combined characters
// (é → e + combining-acute) and we strip the combiners.
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tokenize(query: string): string[] {
  return normalizeForSearch(query)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

// Returns true if every whitespace-delimited token in `query` is contained
// in `haystack` (case + accent insensitive). Empty query returns true.
export function tokenMatch(haystack: string, query: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) return true;
  const hay = normalizeForSearch(haystack);
  for (const t of tokens) {
    if (!hay.includes(t)) return false;
  }
  return true;
}

// Server-side counterpart for Supabase queries. Apply each token as a
// separate `.ilike()` filter — the supabase-js builder ANDs chained
// filters, so all tokens must match. Caller still has to pass the column
// name and the filter target (usually the same).
//
// Usage:
//   let q = client.from("ships").select("*");
//   q = applyTokenIlike(q, "name", "Palatino Daystar");
//   const { data } = await q;
export function applyTokenIlike<T extends { ilike: (col: string, pat: string) => T }>(
  builder: T,
  column: string,
  query: string,
): T {
  const tokens = tokenize(query);
  let b = builder;
  for (const t of tokens) {
    b = b.ilike(column, `%${t}%`);
  }
  return b;
}
