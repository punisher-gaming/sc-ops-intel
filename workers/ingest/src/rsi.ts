// RSI citizen profile scraper — fetches the public citizen page + orgs page
// and extracts the basic display fields (org, rank, citizen number, enlisted
// date, location, language, avatar). Used by /profile?id=… on the frontend
// when the user has set an rsi_handle.
//
// Why scrape: RSI doesn't publish a JSON API. Their public web pages are
// server-rendered HTML with consistent class names, so a few regex passes
// pull out everything we need.
//
// We aggressively edge-cache (1 hour TTL) — citizen profiles barely change,
// and we don't want to hammer RSI on every page view.

const CITIZEN_BASE = "https://robertsspaceindustries.com/citizens";
const UA = "Mozilla/5.0 (compatible; sc-ops-intel-bot)";

export interface RsiProfile {
  handle: string;
  display_handle: string | null;
  moniker: string | null;
  citizen_record: string | null;
  enlisted: string | null;
  location: string | null;
  language: string | null;
  avatar_url: string | null;
  bio: string | null;
  main_org: {
    sid: string | null;
    name: string | null;
    logo_url: string | null;
    rank: string | null;
  } | null;
  affiliated_org_count: number;
  fetched_at: string;
}

// Strip HTML tags and decode the handful of entities RSI emits, then collapse
// whitespace. Used on every extracted field.
function clean(s: string | null | undefined): string | null {
  if (!s) return null;
  const stripped = s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || null;
}

// Pair each `<span class="label">Foo</span>` with the immediately-following
// `<strong|span class="value">…</strong>` — labels are always emitted right
// before their value in RSI's HTML. Returns a Map keyed by lowercase label.
//
// Way more robust than positional ordering, which breaks when fields like
// "Location" or "Org rank" are missing/empty.
function extractLabeledValues(html: string): Map<string, string> {
  const out = new Map<string, string>();
  // Capture label → value pairs that appear close together.
  // Labels look like: <span class="label">Enlisted</span>
  // Values look like: <strong class="value">Sep 5, 2020</strong>
  //                or <span class="value">…</span>
  const rx = /<span\s+class="label"[^>]*>([\s\S]*?)<\/span>[\s\S]{0,200}?<(?:strong|span)\s+class="value"[^>]*>([\s\S]*?)<\/(?:strong|span)>/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html)) !== null) {
    const label = clean(m[1])?.toLowerCase();
    const value = clean(m[2]);
    if (label && value && !out.has(label)) {
      out.set(label, value);
    }
  }
  return out;
}

function extractCitizenRecord(html: string): string | null {
  const m = html.match(
    /<p[^>]*class="[^"]*\bcitizen-record\b[^"]*"[^>]*>[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i,
  );
  return clean(m ? m[1] : null);
}

// The moniker (mixed-case display name) is the FIRST unlabeled
// `<strong class="value">` inside `.profile .info` — it appears before the
// "Handle name" entry. If the user hasn't set a moniker, it's just the
// handle in uppercase, which is uninteresting; we return null in that case
// so the UI can fall back to display_handle.
function extractMoniker(html: string, handle: string): string | null {
  const profileMatch = html.match(
    /<div[^>]*class="[^"]*\bprofile\b[^"]*\bleft-col\b[^"]*"[\s\S]*?<div[^>]*class="info"[\s\S]*?<p[^>]*class="entry"[^>]*>\s*<strong[^>]*class="value"[^>]*>([\s\S]*?)<\/strong>/i,
  );
  const v = clean(profileMatch ? profileMatch[1] : null);
  if (!v) return null;
  // Suppress when it's identical to the handle (case-insensitive)
  if (v.toLowerCase() === handle.toLowerCase()) return null;
  return v;
}

// Main org card — RSI renders this as `<div class="main-org right-col …">`
// directly on the citizen page. Layout (verified):
//   .thumb > a[href=/orgs/SID] > img        (logo)
//   .info > p.entry > a.value (org full name)
//   .info > p.entry > label "SID"   + strong.value (SID code)
//   .info > p.entry > label "Organization rank" + strong.value (rank)
function extractMainOrg(html: string): RsiProfile["main_org"] {
  const block = html.match(
    /<div[^>]*class="[^"]*\bmain-org\b[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i,
  );
  if (!block) return null;
  const b = block[0];
  const sidMatch = b.match(/href="\/orgs\/([A-Z0-9_\-]+)"/i);
  if (!sidMatch) return null; // No org link → user has no main org

  const logoMatch = b.match(/<img[^>]+src="([^"]+)"/i);
  // Org full name = the anchor inside the first .entry
  const nameMatch = b.match(
    /<a[^>]+href="\/orgs\/[^"]+"[^>]*class="[^"]*\bvalue\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
  );
  // Rank = the labeled value inside main-org's .info
  const rankMatch = b.match(
    /<span[^>]*class="[^"]*\blabel\b[^"]*"[^>]*>\s*Organization rank\s*<\/span>\s*<strong[^>]*class="[^"]*\bvalue\b[^"]*"[^>]*>([\s\S]*?)<\/strong>/i,
  );

  return {
    sid: sidMatch[1],
    name: clean(nameMatch ? nameMatch[1] : null),
    logo_url: absolutize(logoMatch ? logoMatch[1] : null),
    rank: clean(rankMatch ? rankMatch[1] : null),
  };
}

function absolutize(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://robertsspaceindustries.com${url}`;
  return url;
}

export async function fetchRsiProfile(handle: string): Promise<RsiProfile | null> {
  // Sanitize: RSI handles are alphanumeric + underscore + dash, max ~30 chars
  const safe = handle.trim().replace(/[^A-Za-z0-9_\-]/g, "");
  if (!safe) return null;

  const [citizenRes, orgsRes] = await Promise.all([
    fetch(`${CITIZEN_BASE}/${encodeURIComponent(safe)}`, {
      headers: { "user-agent": UA, accept: "text/html" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    }),
    fetch(`${CITIZEN_BASE}/${encodeURIComponent(safe)}/organizations`, {
      headers: { "user-agent": UA, accept: "text/html" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    }),
  ]);

  if (citizenRes.status === 404) return null;
  if (!citizenRes.ok) {
    throw new Error(`RSI citizen page: HTTP ${citizenRes.status}`);
  }

  const html = await citizenRes.text();

  // RSI returns 200 with a "page not found" body for invalid handles — sniff
  // for the real profile shell to detect that case.
  if (!/citizen-record|profile-content|class="info"/i.test(html)) {
    return null;
  }

  // Pull labeled values (Enlisted, Location, Languages, etc.) and the
  // unlabeled citizen-record + moniker + org-rank separately.
  const labeled = extractLabeledValues(html);
  const citizen_record = extractCitizenRecord(html);
  const display_handle = labeled.get("handle name") ?? safe;
  const moniker = extractMoniker(html, display_handle);
  const enlisted = labeled.get("enlisted") ?? null;
  const location = labeled.get("location") ?? null;
  const language =
    labeled.get("fluency") ??
    labeled.get("languages") ??
    labeled.get("language") ??
    null;

  // Avatar — pulled from the profile shell. RSI lays it out as the first
  // <img> inside .profile / .left-col.
  const avatarMatch = html.match(/<div[^>]*class="[^"]*\bprofile\b[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"/i);
  const avatar_url = absolutize(avatarMatch ? avatarMatch[1] : null);

  // Bio — div.bio span.value
  const bioMatch = html.match(/<div[^>]*class="[^"]*\bbio\b[^"]*"[\s\S]*?<span[^>]*class="[^"]*\bvalue\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const bio = clean(bioMatch ? bioMatch[1] : null);

  // Main org card (incl. rank) lives on the citizen page itself; the
  // /organizations subpage is only useful for the affiliated count.
  const main_org = extractMainOrg(html);
  let affiliated_org_count = 0;
  if (orgsRes.ok) {
    const orgsHtml = await orgsRes.text();
    // Each org block on /organizations has class containing "org main" or
    // "org affiliation". Count affiliations only.
    const affiliations = orgsHtml.match(
      /<div[^>]*class="[^"]*\borg\b[^"]*\baffiliation\b/gi,
    );
    affiliated_org_count = affiliations?.length ?? 0;
  }

  return {
    handle: safe,
    display_handle,
    moniker,
    citizen_record,
    enlisted,
    location,
    language,
    avatar_url,
    bio,
    main_org,
    affiliated_org_count,
    fetched_at: new Date().toISOString(),
  };
}
