// Thin wrapper for pulling JSON dumps from StarCitizenWiki/scunpacked-data.
// Repo: https://github.com/StarCitizenWiki/scunpacked-data
// Files are raw-served from GitHub (no auth, no LFS on the files we use).
//
// Big files (25–45 MB) are within CF Workers' 128 MB heap. We stream-parse
// where we can, but for now the JSON.parse approach is fine for files under
// ~50 MB. The 107 MB items.json is LFS-backed, we skip it for now and derive
// item metadata opportunistically from blueprint outputs + shop inventory.

const RAW_BASE =
  "https://raw.githubusercontent.com/StarCitizenWiki/scunpacked-data/master";

export async function fetchScunpackedJson<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${RAW_BASE}/${path}`, {
    headers: { accept: "application/json" },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!res.ok) {
    throw new Error(`scunpacked ${path}: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
