// Item image resolver, queries the starcitizen.tools MediaWiki API for
// the canonical page of a given title (item or ship name) and returns a
// thumbnail URL.
//
// The MediaWiki API supports ?origin=* which enables CORS, so we can call
// it directly from the browser without a proxy. Wiki images on
// media.starcitizen.tools are hotlink-friendly (checked in code review).
//
// v1: no DB caching. Results memoised per session in `cache` below so each
// image only resolves once per page load. If this becomes slow we'll add a
// media_url column to the blueprints / ships tables and populate via a
// nightly worker job.

const API = "https://starcitizen.tools/api.php";
const cache = new Map<string, string | null>();

export async function resolveItemImage(
  title: string | null | undefined,
  thumbSize = 400,
): Promise<string | null> {
  if (!title) return null;
  const key = `${title}|${thumbSize}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const url = new URL(API);
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", title);
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("pithumbsize", String(thumbSize));
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");
    url.searchParams.set("redirects", "1");

    const res = await fetch(url.toString());
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const body = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          { thumbnail?: { source?: string }; missing?: boolean | "" }
        >;
      };
    };
    const pages = body?.query?.pages ?? {};
    for (const p of Object.values(pages)) {
      if (p?.missing !== undefined) continue;
      const src = p?.thumbnail?.source;
      if (typeof src === "string" && src.length > 0) {
        cache.set(key, src);
        return src;
      }
    }
    cache.set(key, null);
    return null;
  } catch {
    cache.set(key, null);
    return null;
  }
}

// Try a list of candidate titles in order, first hit wins. Useful for
// items whose in-game name doesn't exactly match the wiki page title.
export async function resolveFirstMatch(
  candidates: Array<string | null | undefined>,
  thumbSize = 400,
): Promise<string | null> {
  for (const c of candidates) {
    const hit = await resolveItemImage(c, thumbSize);
    if (hit) return hit;
  }
  return null;
}
