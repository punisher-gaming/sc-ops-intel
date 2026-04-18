// Thin wrapper around the Star Citizen Wiki API (api.star-citizen.wiki/api/v3).
// Endpoints used:
//   /vehicles         — ships
//   /weapons          — FPS + ship weapons
//   /ship-items       — components (shields, power plants, etc.)
//   /commodities      — tradable goods
// Ref: https://docs.star-citizen.wiki/

export async function fetchPage<T>(
  base: string,
  path: string,
  page = 1,
  perPage = 100,
): Promise<{ data: T[]; hasNext: boolean; totalPages: number }> {
  const url = new URL(`${base}${path}`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(perPage));

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`SC Wiki API ${path} page ${page}: HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    data?: T[];
    meta?: { current_page?: number; last_page?: number };
  };
  const data = body.data ?? [];
  const totalPages = body.meta?.last_page ?? 1;
  const currentPage = body.meta?.current_page ?? page;
  return { data, hasNext: currentPage < totalPages, totalPages };
}

export async function fetchAllPages<T>(
  base: string,
  path: string,
  perPage = 100,
  maxPages = 50,
): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  while (page <= maxPages) {
    const { data, hasNext } = await fetchPage<T>(base, path, page, perPage);
    out.push(...data);
    if (!hasNext || data.length === 0) break;
    page += 1;
  }
  return out;
}
