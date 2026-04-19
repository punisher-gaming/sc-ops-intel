// Curated image references for /lore. Every URL points at Star Citizen
// Wiki's CDN (media.starcitizen.tools), which hosts community-submitted
// screenshots under CC-BY-SA 4.0 and CIG promotional art under their
// fan-content policy. Every image has a visible credit line on the site
// pointing back to the wiki page. If a URL ever breaks we fall back
// automatically to the original SVG art.
//
// Source pattern: https://media.starcitizen.tools/X/XX/Filename.ext
// Wiki page pattern: https://starcitizen.tools/File:Filename.ext

import type { LoreImage } from "./lore-data";

const WIKI_FILE = (name: string) =>
  `https://starcitizen.tools/File:${encodeURIComponent(name)}`;

// Stable CDN URLs verified via MediaWiki's allimages API.
function wiki(
  cdnPath: string,
  filename: string,
  alt: string,
): LoreImage {
  return {
    src: `https://media.starcitizen.tools/${cdnPath}`,
    alt,
    credit: "Star Citizen Wiki · © CIG",
    creditUrl: WIKI_FILE(filename),
  };
}

// ── Cover ── one big spectacular image for the flip-book front cover.
// Saisei is the ecumenopolis (city-planet) of Croshaw — the FIRST
// extrasolar system humans reached. Thematically perfect: the moment
// humanity stopped being a single-world species made flesh.
export const IMG_COVER = wiki(
  "7/7d/Saisei.jpg",
  "Saisei.jpg",
  "Saisei — the ecumenopolis of Croshaw, first extrasolar colony",
);

// ── Chapter hero images ──
export const IMG_CHAPTER = {
  origins:      wiki("3/33/Sol-III%28Earth%29-Cologne.jpg",
                     "Sol-III(Earth)-Cologne.jpg",
                     "Earth seen from orbit"),
  earlyEmpire:  wiki("6/63/UEE-Senate-Chamber-left-wing.png",
                     "UEE-Senate-Chamber-left-wing.png",
                     "UEE Senate Chamber"),
  messerEra:    wiki("1/14/OrionArmitage.jpg",
                     "OrionArmitage.jpg",
                     "Vanduul raid on Orion system"),
  liberation:   wiki("a/a3/UEE-Senate-Chamber-mural-artwork.png",
                     "UEE-Senate-Chamber-mural-artwork.png",
                     "UEE mural marking the fall of the Messers"),
  goldenAge:    wiki("7/75/Area18-AdiraFalls-Tower-Exterior-Daytime.jpg",
                     "Area18-AdiraFalls-Tower-Exterior-Daytime.jpg",
                     "ArcCorp Area18 skyline, Stanton system"),
  currentEra:   wiki("3/35/Pyro-1-orbit-citizencon2022.jpg",
                     "Pyro-1-orbit-citizencon2022.jpg",
                     "Pyro I from orbit"),
};

// ── Race portraits ──
export const IMG_RACE = {
  human:    wiki("4/4c/Sol-III_Aviator.png",
                 "Sol-III_Aviator.png",
                 "UEE Navy pilot"),
  xian:     wiki("1/1d/Xi%27An_helmets_concept.jpg",
                 "Xi'An_helmets_concept.jpg",
                 "Xi'An helmet concept art"),
  banu:     wiki("7/7d/BanuGuildmaster.png",
                 "BanuGuildmaster.png",
                 "Banu guildmaster"),
  vanduul:  wiki("1/1a/Vanduul-CitCon2948.png",
                 "Vanduul-CitCon2948.png",
                 "Vanduul warrior"),
  tevarin:  wiki("5/5b/Tevarin-First-Look.jpg",
                 "Tevarin-First-Look.jpg",
                 "Tevarin warrior concept"),
};

// ── System banners ──
export const IMG_SYSTEM = {
  sol:      wiki("3/33/Sol-III%28Earth%29-Cologne.jpg",
                 "Sol-III(Earth)-Cologne.jpg",
                 "Earth — cradle of humanity"),
  stanton:  wiki("8/89/Hurston-4.3.jpg",
                 "Hurston-4.3.jpg",
                 "Hurston, Stanton system"),
  pyro:     wiki("3/35/Pyro-1-orbit-citizencon2022.jpg",
                 "Pyro-1-orbit-citizencon2022.jpg",
                 "Pyro I from orbit"),
  terra:    wiki("7/7a/Terra2DSystem.png",
                 "Terra2DSystem.png",
                 "Terra system map"),
  croshaw:  wiki("3/32/Croshaw.jpg",
                 "Croshaw.jpg",
                 "Croshaw system"),
  odin:     wiki("b/bf/Odin-archon-station-concept-01.jpg",
                 "Odin-archon-station-concept-01.jpg",
                 "Odin system — Archon Station"),
};
