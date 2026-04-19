// Canonical Star Citizen lore — in-game years (all UEE calendar, not real
// calendar years). Sourced from the SC Wiki, Jump Point magazine, the
// Galactapedia, and Chris Roberts' original design bible circa 2012.
//
// Only a subset of events + entities live here — enough to power the
// /lore chapters without becoming a full wiki mirror. Each entry is
// self-contained (title, blurb, themed color, notable cross-refs).
//
// All prose is original. Images are hotlinked from Star Citizen Wiki
// (media.starcitizen.tools) with credits shown on every image.
// URLs live in lore-images.ts — edit there to swap in other art.

import { IMG_CHAPTER, IMG_RACE, IMG_SYSTEM } from "./lore-images";

// ────── CHAPTERS (eras of UEE history) ──────

export interface LoreEvent {
  year: number;         // UEE calendar year
  title: string;
  body: string;
  tag?: "war" | "first-contact" | "politics" | "tech" | "discovery" | "disaster" | "culture";
}

export type LoreArtKey =
  | "space"
  | "earth"
  | "jump-point"
  | "city"
  | "destruction"
  | "battle"
  | "planet-orbit"
  | "uee-insignia"
  | "ship-fighter"
  | "ship-vanduul"
  | "ship-trader";

export interface LoreChapter {
  slug: string;
  num: string;           // "I" "II" "III" — roman numeral
  title: string;
  subtitle: string;
  yearsFrom: number;
  yearsTo: number;
  blurb: string;        // 1–2 sentence description
  hero: string;         // theme key for hero tinting
  heroArt: LoreArtKey;  // SVG fallback if heroImage is not set
  heroImage?: LoreImage; // real cover image — preferred when present
  glyph: string;        // single emoji/symbol for the chapter card
  events: LoreEvent[];
  // Narrative panels — mixed prose and panel blocks between events
  panels: LoreChapterPanel[];
}

// Future-proofing hook: if/when we license specific artwork (e.g. via
// CIG's Fan Site program with written permission), a panel can declare
// an `image` to use instead of the SVG `art` key. Components prefer
// image when present. Until then, every panel uses original SVG art.
export interface LoreImage {
  src: string;         // absolute URL or /path to a file we host
  alt: string;
  credit: string;      // e.g. "© Cloud Imperium Games — used with permission"
  creditUrl?: string;  // optional link to source
}

export interface LoreChapterPanel {
  kind: "hero" | "text" | "quote" | "splash";
  title?: string;
  body?: string;
  quote?: string;
  attribution?: string;
  caption?: string;
  // Associated artwork for this panel. "splash" panels are full-bleed
  // image spreads; "hero" and "text" get inline art on one side.
  art?: LoreArtKey;
  artSide?: "left" | "right" | "full";
  image?: LoreImage;   // wins over `art` when present (licensed swap-in)
  // theme tint for visual panels — maps to a CSS variable
  accent?: "cyan" | "amber" | "red" | "green" | "violet";
}

export const CHAPTERS: LoreChapter[] = [
  {
    slug: "origins",
    num: "I",
    title: "Origins",
    subtitle: "First steps beyond the cradle",
    yearsFrom: 2075,
    yearsTo: 2262,
    blurb:
      "Humanity's first reach into the stars: fusion, colonies, and the discovery that jump points are real.",
    hero: "earth-blue",
    heroArt: "earth",
    heroImage: IMG_CHAPTER.origins,
    glyph: "🜨",
    events: [
      { year: 2075, title: "Solar Max project goes online", tag: "tech",
        body: "Abundant fusion power ends the energy scarcity that kept humans earthbound. Within a decade, the first permanent habitats ring Mars." },
      { year: 2113, title: "First extrasolar colony established", tag: "discovery",
        body: "A generation ship plants the flag on Croshaw — not yet knowing Croshaw is only reachable because of a jump point nobody has mapped." },
      { year: 2157, title: "Nick Croshaw discovers the first jump point", tag: "discovery",
        body: "A lone pilot in a modified racer threads a gravitational anomaly and arrives, dazed, 68 light-years from Sol. The Verse opens." },
      { year: 2232, title: "United Nations of Earth (UNE) formed", tag: "politics",
        body: "Decades of resource wars over jump-point access end with the formation of a planetary government. Earth speaks with one voice for the first time in history." },
      { year: 2262, title: "First FTL flight of the Artemis", tag: "tech",
        body: "Quantum drives make the jump-point network useful. The expansion accelerates from trickle to flood." },
    ],
    panels: [
      {
        kind: "splash", art: "earth", artSide: "full", accent: "cyan",
        title: "Before the Verse",
        caption: "Earth, 2075 — the Solar Max project comes online.",
      },
      {
        kind: "hero", title: "The Distance Problem",
        art: "space", artSide: "right", accent: "cyan",
        body: "In the late 21st century, humanity's greatest enemy was distance. The same distance that had always been there. Then a miner named Nick Croshaw found something the physicists said was impossible — a knotted throat of spacetime that ended somewhere else.",
      },
      {
        kind: "splash", art: "jump-point", artSide: "full", accent: "cyan",
        title: "The First Jump",
        caption: "Croshaw System — 2157 UEE. One pilot, one anomaly, 68 light-years in a single breath.",
      },
      {
        kind: "quote", accent: "cyan",
        quote: "They told me to turn back. I turned further in.",
        attribution: "— Nick Croshaw, logbook, 2157",
      },
      {
        kind: "text",
        art: "city", artSide: "left", accent: "cyan",
        title: "The Flood Begins",
        body: "Within a century of Croshaw's discovery, hundreds of jump points had been charted. Humanity was no longer a single-world species. The old political systems buckled under the weight of colonies that were months of communication away. The UNE formed from the ashes of the Coalition Wars.",
      },
    ],
  },
  {
    slug: "early-empire",
    num: "II",
    title: "The Early Empire",
    subtitle: "Expansion, first aliens, first alliances",
    yearsFrom: 2262,
    yearsTo: 2523,
    blurb:
      "The UNE becomes the UPE, then begins making contact with civilizations humanity had always assumed weren't there.",
    hero: "violet-dawn",
    heroArt: "space",
    heroImage: IMG_CHAPTER.earlyEmpire,
    glyph: "✺",
    events: [
      { year: 2380, title: "United Planets of Earth (UPE) replaces UNE", tag: "politics",
        body: "The government restructures to represent the growing web of colonies, not just Earth. Seat of power moves to the Neutral Zone on Luna." },
      { year: 2438, title: "First contact: the Xi'An", tag: "first-contact",
        body: "A UPE scout ship meets a civilization that has been watching us for longer than we have been a species. The Xi'An are polite, patient, and unreadable. A cold peace begins." },
      { year: 2462, title: "First contact: the Banu", tag: "first-contact",
        body: "A decentralized federation of trade guilds, the Banu are the first species humanity signs a formal treaty with. Still active today." },
      { year: 2490, title: "The Merchantman trade era peaks", tag: "culture",
        body: "Banu Merchantmen become a common sight in UPE ports. Hexagonal hulls, swappable module bays, legendary build quality. Prosperity, briefly." },
    ],
    panels: [
      {
        kind: "splash", art: "uee-insignia", artSide: "full", accent: "violet",
        title: "The United Planets of Earth",
        caption: "2380 — the UNE restructures as the UPE, shifting power from Earth to Luna.",
      },
      {
        kind: "text",
        art: "space", artSide: "left", accent: "violet",
        title: "Alone in the Dark",
        body: "For two centuries after Croshaw's jump, humanity expanded alone. The universe stubbornly refused to produce neighbors. When it finally did — the Xi'An in 2438 — it was because a UPE scout strayed into space they had mapped long before our species evolved.",
      },
      {
        kind: "quote", accent: "violet",
        quote: "We have been aware of you. You have not been aware of us. This is the nature of things.",
        attribution: "— First recorded Xi'An transmission, 2438",
      },
      {
        kind: "hero",
        art: "ship-trader", artSide: "right", accent: "amber",
        title: "The Banu Handshake",
        body: "Where contact with the Xi'An was a chess game, contact with the Banu was a market day. The Banu Protectorate is a confederation of trade-guild homeworlds. Their first act upon meeting humanity was to offer a discount.",
      },
    ],
  },
  {
    slug: "messer-era",
    num: "III",
    title: "The Messer Era",
    subtitle: "Dictatorship, and the wars that forged a citizenry",
    yearsFrom: 2523,
    yearsTo: 2792,
    blurb:
      "Twenty-five generations of the Messer dynasty rule humanity. The Vanduul arrive. The Tevarin fall twice.",
    hero: "red-militant",
    heroArt: "destruction",
    heroImage: IMG_CHAPTER.messerEra,
    glyph: "⌖",
    events: [
      { year: 2523, title: "Ivar Messer seizes power", tag: "politics",
        body: "Using a manufactured Tevarin invasion scare, General Ivar Messer dissolves the UPE Senate and crowns himself First Citizen. The empire has a dictator for the first time. The Messer dynasty will hold the throne for twenty-five generations." },
      { year: 2530, title: "The Xi'An Cold War begins", tag: "war",
        body: "Messer propaganda paints the Xi'An as an existential threat. Both sides militarize the shared border. No shots are fired for four centuries." },
      { year: 2541, title: "First Tevarin War", tag: "war",
        body: "The Tevarin Prime Empire invades the Elysium system. The UEE fleet is unprepared, loses early engagements, then rallies under a young Commodore Corsen. Twenty-two years of open war follow." },
      { year: 2546, title: "The fall of Garron II", tag: "disaster",
        body: "A Vanduul warband — a species humanity had not yet named — destroys the Garron II colony in a single orbital pass. First recorded Vanduul aggression. The pattern will repeat." },
      { year: 2563, title: "Kaleeth taken — Tevarin defeated", tag: "war",
        body: "The First Tevarin War ends in UEE victory. The Messer regime announces the homeworld of Kaleeth will be terraformed into a human colony — over the surviving Tevarin population's objections." },
      { year: 2610, title: "Tevarin homeworld renamed Elysium IV", tag: "war",
        body: "Terraforming completes. Kaleeth becomes Elysium IV. The surviving Tevarin scatter across human space — refugees in a government that took their world." },
      { year: 2681, title: "Second Tevarin War", tag: "war",
        body: "The last Tevarin warlord, Corath'Thal, gathers the diaspora and retakes Kaleeth for a single desperate month. He is killed in orbit. The Tevarin never rise again as an independent people." },
      { year: 2789, title: "Fair Chance Act signed", tag: "politics",
        body: "In response to the Tevarin genocide, the UEE passes legislation protecting any star system containing sapient life from colonization. Hard-won atonement. Still the law." },
    ],
    panels: [
      {
        kind: "splash", art: "uee-insignia", artSide: "full", accent: "red",
        title: "The Dictatorship Rises",
        caption: "2523 — Ivar Messer dissolves the Senate. The empire has a face, and it is his.",
      },
      {
        kind: "text",
        art: "city", artSide: "right", accent: "red",
        title: "Twenty-Five Generations",
        body: "Ivar Messer's coup was supposed to last a generation. It lasted twenty-five. Under the Messers the UEE became the most powerful military force in known space — and the most oppressive government humans had ever built. State-controlled news. Disappeared dissidents. Mandatory patriotic service for every citizen.",
      },
      {
        kind: "quote", accent: "red",
        quote: "The sacrifice of the few secures the future of the many. The sacrifice of the many secures the future of the empire.",
        attribution: "— Messer doctrine, widely quoted",
      },
      {
        kind: "splash", art: "destruction", artSide: "full", accent: "red",
        title: "Garron II Burns",
        caption: "2546 — first recorded Vanduul raid. Half a colony gone in ninety minutes.",
      },
      {
        kind: "hero",
        art: "ship-vanduul", artSide: "left", accent: "red",
        title: "The Vanduul Appear",
        body: "The Vanduul don't have a homeworld — not one we've found. They raid in nomadic clan-fleets, strike without diplomacy, and vanish. The fall of Garron II in 2546 was the opening note of a war that has not stopped since.",
      },
      {
        kind: "splash", art: "battle", artSide: "full", accent: "red",
        title: "The Tevarin Wars",
        caption: "2541–2610 — two wars end with the Tevarin losing their homeworld to UEE terraforming.",
      },
      {
        kind: "text",
        art: "planet-orbit", artSide: "right", accent: "green",
        title: "Elysium IV — formerly Kaleeth",
        body: "The Tevarin Wars left a permanent wound. The UEE won, yes; and then it took everything. The Tevarin are still among us — fully citizens now, serving in the Navy, sitting in the Senate — but their homeworld is a human paradise called Elysium IV. You can visit. It's beautiful. That's the problem.",
      },
    ],
  },
  {
    slug: "liberation",
    num: "IV",
    title: "The Liberation",
    subtitle: "How the Messers fell",
    yearsFrom: 2792,
    yearsTo: 2920,
    blurb:
      "A century of reformist movements, culminating in the uprising of 2792 and the quiet execution of the last Messer.",
    hero: "green-dawn",
    heroArt: "city",
    heroImage: IMG_CHAPTER.liberation,
    glyph: "☄",
    events: [
      { year: 2792, title: "The March on New Paris", tag: "politics",
        body: "Millions of citizens converge on the UEE capital. The Messer loyalists open fire. The fleet refuses orders to escalate. The regime collapses in 72 hours." },
      { year: 2800, title: "First free elections in 280 years", tag: "politics",
        body: "Imperator Erin Toi is elected by a planetary plebiscite. The UEE Senate is reconstituted with genuine powers for the first time since 2523." },
      { year: 2872, title: "Second Tevarin War (Corath'Thal's rebellion)", tag: "war",
        body: "Corath'Thal's rebellion begins. The newly democratic UEE responds with restraint and diplomacy. The Tevarin are integrated, not exterminated." },
      { year: 2920, title: "Last Messer executed", tag: "politics",
        body: "The final direct-line Messer heir is tried for crimes against humanity and executed. The dynasty ends after 397 years." },
    ],
    panels: [
      {
        kind: "splash", art: "city", artSide: "full", accent: "green",
        title: "The March on New Paris",
        caption: "2792 — millions converge on the capital. The fleet refuses to escalate.",
      },
      {
        kind: "hero",
        art: "uee-insignia", artSide: "left", accent: "green",
        title: "The March",
        body: "Nobody knows who started it. A civil servant refused an order. A fleet captain refused to fire. A tram operator refused to drive. Within three days the Messer regime had no infrastructure, no military, and nowhere to flee. It ended not in a battle but in paperwork.",
      },
      {
        kind: "quote", accent: "green",
        quote: "We did not vote this government in. We were born into it. We chose to no longer consent.",
        attribution: "— Ilsa Messer, final radio address, 2792",
      },
    ],
  },
  {
    slug: "golden-age",
    num: "V",
    title: "The Golden Age",
    subtitle: "Prosperity, expansion, and the Vanduul at the gates",
    yearsFrom: 2920,
    yearsTo: 2942,
    blurb:
      "The UEE rebuilds as a democracy. Trade flourishes. But the Vanduul are no longer raiders — they are a tide.",
    hero: "gold-prosper",
    heroArt: "city",
    heroImage: IMG_CHAPTER.goldenAge,
    glyph: "⚜",
    events: [
      { year: 2931, title: "Imperator Toi establishes the modern UEE", tag: "politics",
        body: "A constitutional framework that has survived every attempt to weaken it since. The \"Terran Bill of Rights\" is signed into law." },
      { year: 2938, title: "Stanton system sold to the MegaCorps", tag: "politics",
        body: "In an attempt to balance the budget after centuries of Messer military spending, the UEE sells development rights to four planets in the Stanton system to Hurston Dynamics, Crusader Industries, ArcCorp, and microTech." },
      { year: 2938, title: "Lorville construction begins", tag: "culture",
        body: "Hurston Dynamics breaks ground on Lorville — a soot-black mining capital that will grow into the largest city on any corporate-owned world. Indentured contracts and air quality complaints start the same year." },
      { year: 2940, title: "Orison opens above Crusader", tag: "culture",
        body: "Crusader Industries completes Orison — a floating city-platform suspended in the upper atmosphere of the gas giant. No ground. Just clouds, and the ships that sell there." },
      { year: 2941, title: "ArcCorp declared an ecumenopolis", tag: "culture",
        body: "ArcCorp's Area18 megacity grows until it merges with the surrounding cities. The entire planet is officially declared a single continuous urban environment." },
      { year: 2942, title: "The Vanduul take Orion", tag: "disaster",
        body: "After decades of escalating raids, the Vanduul sack the human-colonized Orion system in a single coordinated campaign. Half a million dead. The UEE finally accepts this is no longer a border skirmish — it is a war." },
    ],
    panels: [
      {
        kind: "splash", art: "city", artSide: "full", accent: "amber",
        title: "The Golden Age Begins",
        caption: "2931 — Terra Prime. Largest city-skyline outside Earth.",
      },
      {
        kind: "text",
        art: "ship-trader", artSide: "right", accent: "amber",
        title: "The Fastest Century",
        body: "The first half of the UEE's democratic era is remembered as The Golden Age for a reason. Jump points were mapped faster than any time since Croshaw. Trade exploded. The corporations grew powerful enough to buy entire star systems — literally, in Stanton's case.",
      },
      {
        kind: "hero",
        art: "planet-orbit", artSide: "left", accent: "amber",
        title: "Stanton — the Sold System",
        body: "Four worlds. Four corporations. Hurston Dynamics bought a planet to extract minerals. Crusader Industries to build starliners. ArcCorp to manufacture electronics. microTech to develop software. Each is a company town the size of a world. They answer to shareholders first, the UEE second.",
      },
      {
        kind: "splash", art: "destruction", artSide: "full", accent: "red",
        title: "Orion Falls",
        caption: "2942 — Vanduul coordinated offensive erases a colonized system. Half a million dead.",
      },
      {
        kind: "quote", accent: "amber",
        quote: "We were told the Orion system was safe. We were told the Vanduul were raiders. Half a million dead. The dictionary now needs a new word.",
        attribution: "— Imperator Costigan, address to the Senate, 2942",
      },
    ],
  },
  {
    slug: "current-era",
    num: "VI",
    title: "The Current Era",
    subtitle: "Pyro, Xenothreat, and the war that won't end",
    yearsFrom: 2942,
    yearsTo: 2952,
    blurb:
      "The UEE you fly in. Stanton stabilized. Pyro opened. The Vanduul push deeper. The next jump point is always tomorrow.",
    hero: "cyan-live",
    heroArt: "jump-point",
    heroImage: IMG_CHAPTER.currentEra,
    glyph: "⟳",
    events: [
      { year: 2944, title: "Project Synthesis begins", tag: "tech",
        body: "UEE R&D formally launches the effort to reverse-engineer Vanduul clan-ship technology. Results still classified." },
      { year: 2947, title: "The Pyro Jump opens to civilians", tag: "discovery",
        body: "A long-sealed jump gate connecting Stanton to the Pyro system is opened. Pyro is lawless — no UEE jurisdiction, no refueling network, no help coming. Pilots go anyway." },
      { year: 2950, title: "Xenothreat declares war on the UEE", tag: "war",
        body: "A splinter faction of Pyrotechnic pirates and ex-military hardliners launches coordinated attacks on Stanton-Pyro traffic. The UEE Navy responds. The conflict is ongoing." },
      { year: 2952, title: "Pyro opens officially", tag: "discovery",
        body: "CIG — sorry, the UEE — declares the Pyro system fully explored and mapped. Civilian presence is discouraged but not illegal. New citizens arrive daily." },
      { year: 2952, title: "You arrive", tag: "culture",
        body: "Every citizen enlisting in 2952 steps into a Verse that still isn't finished being mapped. New jump points are discovered monthly. The next chapter of this history is one you write." },
    ],
    panels: [
      {
        kind: "splash", art: "jump-point", artSide: "full", accent: "cyan",
        title: "The Pyro Gate Opens",
        caption: "2947 — a jump point sealed for 484 years re-opens to civilians.",
      },
      {
        kind: "hero",
        art: "space", artSide: "right", accent: "cyan",
        title: "The Verse Today",
        body: "You've arrived at a specific moment. The Banu still trade. The Xi'An still watch. The Vanduul are still out there, reshaping clan-fleets into something that terrifies the Navy. Pyro is full of people who don't want the UEE to find them. Stanton is the safe bet — but only because the corporations don't want trouble where they do business.",
      },
      {
        kind: "splash", art: "battle", artSide: "full", accent: "red",
        title: "Xenothreat",
        caption: "2950 — a pirate coalition declares war on UEE traffic. The Navy answers.",
      },
      {
        kind: "text",
        art: "ship-fighter", artSide: "left", accent: "cyan",
        title: "The Next Chapter",
        body: "Every player enlisting in the UEE in 2952 is stepping into a Verse that still isn't finished being mapped. Jump points are being discovered monthly. New species have been hinted at in classified Navy signals-intelligence reports that journalists keep leaking. The next chapter of this history is one you write.",
      },
      {
        kind: "quote", accent: "cyan",
        quote: "o7, citizen. The stars are open.",
        attribution: "— Standard UEE Navy enlistment closing",
      },
    ],
  },
];

// ────── RACES ──────

export interface LoreRace {
  slug: string;
  name: string;
  subtitle: string;
  relationship: "UEE" | "Ally" | "Neutral" | "Hostile" | "Extinct (cultural)";
  homeworld: string;
  homeSystem: string;
  population: string;
  glyph: string;        // emoji
  accent: "cyan" | "amber" | "red" | "green" | "violet" | "pink";
  firstContact?: number; // UEE year
  blurb: string;        // 1-2 sentence
  body: string[];       // longer paragraphs
  culture: string;
  notable: string[];    // bullet list of notable traits
  heroImage?: LoreImage; // real portrait — preferred over SVG RacePortrait
}

export const RACES: LoreRace[] = [
  {
    slug: "human",
    name: "Human",
    subtitle: "The Empire — dominant species of the UEE",
    relationship: "UEE",
    homeworld: "Earth",
    homeSystem: "Sol",
    population: "~7.2 trillion across the UEE",
    glyph: "🜨",
    accent: "cyan",
    blurb:
      "Post-scarcity, post-unification, post-everything — humanity expanded into the Verse on fusion power and hasn't stopped since.",
    body: [
      "Humans are the species you play as. We spread from Earth through the jump-point network over 900 years, built empires and dismantled them, fought wars with neighbors we didn't know existed, and ended up with the largest contiguous territory of any known species.",
      "Human culture in 2952 is not monolithic. Core-world citizens in Sol or Terra grew up on clean water and subsidized education. Outer-rim colonists on Hurston or the Pyro border know how to weld a hull patch in hard vacuum. Corporate citizens of the four Stanton worlds pledge loyalty to Hurston or microTech or ArcCorp as easily as to the UEE.",
      "The UEE military — the Navy, the Marine Corps, the Advocacy — is the largest institution humans have ever built. It employs one citizen in twelve, and every Imperator since Toi has been a veteran.",
    ],
    culture:
      "Pluralistic, commercial, militarily pragmatic. Values personal freedom, economic mobility, and a wary respect for aliens who can be bargained with.",
    notable: [
      "Only species to have fought wars on both sides of the jump-point network",
      "Maintains formal treaties with the Xi'An and Banu; ongoing war with the Vanduul",
      "The Fair Chance Act of 2789 is the UEE's most cited (and most bent) law",
    ],
    heroImage: IMG_RACE.human,
  },
  {
    slug: "xian",
    name: "Xi'An",
    subtitle: "The Patient Observers",
    relationship: "Ally",
    homeworld: "RyiXy'an",
    homeSystem: "Eealus",
    population: "Unknown (classified by the Xi'An)",
    glyph: "✺",
    accent: "violet",
    firstContact: 2438,
    blurb:
      "A civilization older than human agriculture. Patient, precise, unreadable — and, for the last century, our friends.",
    body: [
      "The Xi'An are ancient. They had interstellar flight when humans were inventing fire. Everything we know about them has been chosen by them to share.",
      "For four centuries after first contact, the Xi'An Empire and the UEE were in a formal cold war — largely manufactured by Messer propaganda on the human side. When the Messers fell in 2792, Imperator Toi's first major diplomatic act was the Treaty of Goss, normalizing relations. The Xi'An accepted, exactly as they had quietly proposed forty years earlier.",
      "Xi'An manufactured goods — ships, weapons, furniture — are prized throughout the UEE for unmatched craftsmanship. Aopoa, the dominant Xi'An starship manufacturer, makes every human fighter builder jealous.",
    ],
    culture:
      "Hierarchical, long-lived (a Xi'An centenarian is considered young), deliberate to the point of geological patience. Humor exists but is usually a decade in the setup.",
    notable: [
      "Average lifespan ~270 standard years",
      "Aopoa ship manufacturer produces the Khartu-al, San'tok.yāi, and more",
      "Xi'An language syntax is tonal and contextual — humans rarely achieve true fluency",
    ],
    heroImage: IMG_RACE.xian,
  },
  {
    slug: "banu",
    name: "Banu",
    subtitle: "The Trader Confederation",
    relationship: "Ally",
    homeworld: "BaKaah",
    homeSystem: "Bacchus",
    population: "Estimated 300 billion, spread across the Protectorate",
    glyph: "⟐",
    accent: "amber",
    firstContact: 2462,
    blurb:
      "A species where the guild is the nation. Banu society has no single government — only hundreds of trade guilds in loose confederation.",
    body: [
      "The Banu were the first species humanity signed a formal treaty with, and the relationship has been stable for half a millennium. They see the universe as a market. Every planet is a shop. Every interaction is a deal, even friendly ones.",
      "A Banu citizen belongs first to their guild (Souli), then their homeworld, then the Banu Protectorate as an afterthought. There is no Banu Emperor. The Banu Protectorate exists primarily to represent the Souli collectively when outsiders insist on talking to one authority.",
      "Banu manufactured ships — especially from the Banu Defender and Banu Merchantman traditions — are rarities in human space but legendary for quality.",
    ],
    culture:
      "Mercantile, decentralized, pragmatic. Lifespan roughly equal to humans. Individual Banu often have no use for abstract loyalty but intense loyalty to their guild.",
    notable: [
      "No single capital world; the Protectorate rotates meetings between guild homeworlds",
      "Banu tongue is guttural and fast; nearly all Banu merchants speak passable human Standard",
      "Most Banu ships feature distinctive hexagonal hull plating and swappable module bays",
    ],
    heroImage: IMG_RACE.banu,
  },
  {
    slug: "vanduul",
    name: "Vanduul",
    subtitle: "The Nomadic Storm",
    relationship: "Hostile",
    homeworld: "Unknown (nomadic)",
    homeSystem: "Unknown — clan-fleets roam",
    population: "Unknown (likely billions across clan-fleets)",
    glyph: "⚔",
    accent: "red",
    firstContact: 2546,
    blurb:
      "Nomadic. Predatory. No embassy. No trade. Every known Vanduul encounter began when they were already shooting.",
    body: [
      "The Vanduul are the UEE's primary adversary and the species that defines the current era. Unlike the Xi'An or Banu, the Vanduul have no fixed worlds — their civilization is a fleet of fleets, generational clanships that raid, retreat, and sometimes assimilate whole human colonies.",
      "Nobody in UEE intelligence knows what the Vanduul want, or why they target humans specifically, or whether their leadership is unified or factional. Captured Vanduul invariably suicide before interrogation. Their language has been partially decoded but nothing resembling a diplomatic overture has ever been heard.",
      "The Vanduul Scythe is the fighter every new UEE pilot learns to recognize — sleek, sharp, and usually attacking something important.",
    ],
    culture:
      "Predatory and clan-based. Individuals within a clan are fiercely loyal; rival clans will fight each other as readily as they fight humans. Age and combat honor appear central to their hierarchy.",
    notable: [
      "Responsible for the fall of Orion (2942), Garron II (2546), Caliban (2884), and many more",
      "Scythe-class fighters are the most common Vanduul engagement",
      "No recorded Vanduul prisoner has ever spoken to an interrogator",
    ],
    heroImage: IMG_RACE.vanduul,
  },
  {
    slug: "tevarin",
    name: "Tevarin",
    subtitle: "The Last Warriors of Kaleeth",
    relationship: "UEE",
    homeworld: "Jalan (formerly Kaleeth, now human-terraformed)",
    homeSystem: "Elysium",
    population: "~15 billion, citizens of the UEE",
    glyph: "⚔",
    accent: "green",
    firstContact: 2541,
    blurb:
      "Twice-defeated, once-exterminated, now UEE citizens. The Tevarin are a living reminder of the sins of the Messer era.",
    body: [
      "The Tevarin were a warrior civilization with a single homeworld — Kaleeth, in what is now the Elysium system. The First Tevarin War (2541–2563) ended in their military defeat; the Messer regime then terraformed Kaleeth into a human colony over the surviving Tevarin population's objections.",
      "The diaspora scattered. For two centuries, the Tevarin existed as a refugee people across human space, second-class citizens in a government that had taken their world. In 2872, under Corath'Thal, they briefly reclaimed Kaleeth in an act of desperate symbolism. The rebellion was crushed.",
      "Modern UEE citizenship law — including the Fair Chance Act — is partly atonement. Tevarin serve in the Navy, sit in the Senate, run corporations. But the homeworld is gone, and the words \"Kaleeth\" and \"Jalan\" name the same planet depending on who's speaking.",
    ],
    culture:
      "Warrior ethos, rohan ritual combat tradition, strong oral history. A Tevarin knows their full ancestry back to the First War; most humans cannot name their great-grandparents.",
    notable: [
      "The Tevarin martial art of rijora is taught in UEE Marine training",
      "Corath'Thal's final speech is required reading in UEE civics courses",
      "The Esperia Talon (reproduction of a Tevarin fighter) is a favorite of competitive pilots",
    ],
    heroImage: IMG_RACE.tevarin,
  },
];

// ────── STAR SYSTEMS ──────

export interface LoreSystem {
  slug: string;
  name: string;
  kind: "UEE" | "Frontier" | "Unclaimed" | "Hostile" | "Protected";
  subtitle: string;
  sunType: string;
  jumpPoints: number;
  planets: string[];
  firstCharted: number;   // UEE year
  blurb: string;
  body: string[];
  notable: string[];
  accent: "cyan" | "amber" | "red" | "green" | "violet";
  glyph: string;
  heroImage?: LoreImage;  // real banner image — preferred over SVG orbit
}

export const SYSTEMS: LoreSystem[] = [
  {
    slug: "sol",
    name: "Sol",
    kind: "UEE",
    subtitle: "Cradle — the homeworld system",
    sunType: "G-type yellow dwarf",
    jumpPoints: 4,
    planets: ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"],
    firstCharted: -4500000000,
    blurb:
      "Where humanity began. Still the political center of the UEE despite Terra's commercial dominance.",
    body: [
      "Sol is the system every human child learns first. Earth is still inhabited — cleaner than at any point since the Industrial Age. Mars holds the largest human city off Earth. Luna is the diplomatic neutral ground where every major treaty has been signed since the Xi'An accords.",
      "Travel within Sol is free and fast — the infrastructure has been built out for nearly a millennium. Sol is also a common assignment for young Navy pilots: safe, well-patrolled, and the paperwork never breaks.",
    ],
    notable: [
      "Luna hosts the UEE Senate's diplomatic annex and every inter-species treaty signing",
      "Jupiter's moons were the first non-Earth human settlements (mid-2000s pre-UEE)",
      "The Sol-Croshaw jump point was mapped by Nick Croshaw himself in 2157",
    ],
    accent: "cyan",
    glyph: "☉",
    heroImage: IMG_SYSTEM.sol,
  },
  {
    slug: "stanton",
    name: "Stanton",
    kind: "UEE",
    subtitle: "The Corporate System — four worlds, four companies",
    sunType: "F-type main-sequence",
    jumpPoints: 3,
    planets: ["Hurston", "Crusader", "ArcCorp", "microTech"],
    firstCharted: 2851,
    blurb:
      "Each of the four habitable planets here was sold by the UEE to a different MegaCorp in 2938. The most developed non-Sol system in the empire.",
    body: [
      "Stanton is the game's tutorial system and most players' home in the Verse. Hurston is mining and heavy industry; Crusader is ship manufacturing and cloud cities; ArcCorp is electronics and sprawling urbanization; microTech is software and frozen wilderness.",
      "Every Stanton world is functionally a company town at planetary scale. UEE law applies — but the corporations write the local regulations, run the police, and own the land. For most players this is invisible. For anyone who gets on a Hurston Dynamics blacklist, it is very, very visible.",
    ],
    notable: [
      "Only system where a MegaCorp owns planetary development rights (as of 2952)",
      "Home to the four largest UEE cities outside Sol: Lorville, Orison, Area18, New Babbage",
      "Stanton-Pyro jump point opened to civilians in 2947",
    ],
    accent: "amber",
    glyph: "☆",
    heroImage: IMG_SYSTEM.stanton,
  },
  {
    slug: "pyro",
    name: "Pyro",
    kind: "Unclaimed",
    subtitle: "The Lawless Frontier",
    sunType: "Red dwarf (flare-prone)",
    jumpPoints: 2,
    planets: ["Pyro I", "Monox", "Bloom", "Terminus", "Pyro V", "Pyro VI"],
    firstCharted: 2438,
    blurb:
      "No UEE presence. No courts, no police, no refueling network guaranteed. The wild edge of known space.",
    body: [
      "Pyro was surveyed, colonized, and abandoned centuries ago when the corporate backers folded. The jump gate was sealed by the UEE Navy in 2463 and remained sealed for 484 years. It reopened in 2947 to civilian traffic — or, more accurately, civilian traffic reopened it.",
      "Today Pyro is a playground for outlaws, pirates, ex-military hardliners, miners who prefer no taxes, and a sizable population of Xenothreat. The Fair Chance Act does not apply here because no known sapient species is native. The UEE Navy does not patrol — they advise you not to visit and remind you no rescue is coming.",
    ],
    notable: [
      "Home system of the Xenothreat splinter faction",
      "Six planets, four derelict outposts, one decommissioned refinery, zero UEE installations",
      "Pyro's star is an active flare star — EVA timing matters here",
    ],
    accent: "red",
    glyph: "☼",
    heroImage: IMG_SYSTEM.pyro,
  },
  {
    slug: "terra",
    name: "Terra",
    kind: "UEE",
    subtitle: "The Second Cradle — commercial capital",
    sunType: "G-type (near-Sol analog)",
    jumpPoints: 7,
    planets: ["Pike", "Magda", "Terra", "Henge"],
    firstCharted: 2516,
    blurb:
      "A planet so Earth-like that terraforming was unnecessary. Terra is the center of UEE commerce, finance, and increasingly politics.",
    body: [
      "Terra was the luckiest find in UEE history — a fully habitable planet requiring no terraforming, discovered during a routine jump-point sweep in 2516. Within a century it was the second-most populous human world after Earth.",
      "Terra's commercial power makes its politics a permanent undercurrent in UEE life. Terra elects senators. Terra produces Imperators (Costigan, most recently). A long-running movement argues the UEE capital should be moved here from Earth. That movement has lost every vote for eighty years, and keeps running.",
    ],
    notable: [
      "Seven charted jump points — more than any other UEE system, making it a logistics hub",
      "Terra Prime (city) has the largest financial exchange off Earth",
      "Gen. Marshall Lee (Terran) led the 2792 Fleet mutiny that toppled the Messers",
    ],
    accent: "green",
    glyph: "⊕",
    heroImage: IMG_SYSTEM.terra,
  },
  {
    slug: "croshaw",
    name: "Croshaw",
    kind: "UEE",
    subtitle: "Where the Verse began",
    sunType: "K-type orange dwarf",
    jumpPoints: 3,
    planets: ["Liir", "Croshaw", "Dyan", "Saisei"],
    firstCharted: 2157,
    blurb:
      "The first star system humans reached via jump point. Named for the miner who opened the door.",
    body: [
      "When Nick Croshaw emerged from his jump in 2157 he arrived at a K-type star system sixty-eight light-years from Sol. The UEE now calls it Croshaw, the planet Croshaw is named for Croshaw, the crater he landed on is named for Croshaw, and — depending on your taste — this is either heartwarming or overkill.",
      "Saisei is the system's largest city, an ecumenopolis (city-planet) built over centuries of colonization. Academic institutions dominate. Croshaw Academy of Space Sciences is the MIT of the UEE and has produced nearly every notable jump-point cartographer of the modern era.",
    ],
    notable: [
      "First extrasolar system visited by humans",
      "Saisei Prime is an ecumenopolis — fully urbanized planet",
      "Croshaw Academy is the UEE's premier jump-point research institution",
    ],
    accent: "violet",
    glyph: "✦",
    heroImage: IMG_SYSTEM.croshaw,
  },
  {
    slug: "odin",
    name: "Odin",
    kind: "Protected",
    subtitle: "Fair Chance Act — no colonization permitted",
    sunType: "White dwarf (dying)",
    jumpPoints: 2,
    planets: ["Vili", "Eir (protected)"],
    firstCharted: 2651,
    blurb:
      "A dying star and the sole known system containing a potential sapient species. Protected by treaty, inhabited by no one.",
    body: [
      "Odin is a failed future. The system's white dwarf is in a late stage — Vili and the former homeworld of the pre-sapient \"Ganymede lifeform\" are both on slow tracks toward uninhabitability. The Fair Chance Act protects the system from colonization on the ethical grounds that Ganymede life, while not currently sapient, could be.",
      "UEE Navy patrols enforce the exclusion. Smugglers sometimes stage from Odin because its protected status makes patrols predictable. The science outposts orbiting Eir are the only permanent human presence — and they are there specifically to study the Ganymede without touching it.",
    ],
    notable: [
      "Only currently protected system under the Fair Chance Act",
      "Ganymede lifeform is the primary study subject of every xenobiologist in the UEE",
      "Navy presence is sparse but active — smugglers who get caught here never get caught twice",
    ],
    accent: "cyan",
    glyph: "◉",
    heroImage: IMG_SYSTEM.odin,
  },
];

// ────── HELPERS ──────

export function getChapter(slug: string): LoreChapter | null {
  return CHAPTERS.find((c) => c.slug === slug) ?? null;
}
export function getRace(slug: string): LoreRace | null {
  return RACES.find((r) => r.slug === slug) ?? null;
}
export function getSystem(slug: string): LoreSystem | null {
  return SYSTEMS.find((s) => s.slug === slug) ?? null;
}
