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

function wiki(cdnPath: string, filename: string, alt: string): LoreImage {
  return {
    src: `https://media.starcitizen.tools/${cdnPath}`,
    alt,
    credit: "Star Citizen Wiki · © CIG",
    creditUrl: WIKI_FILE(filename),
  };
}

// ── Cover ──
export const IMG_COVER = wiki(
  "7/7d/Saisei.jpg",
  "Saisei.jpg",
  "Saisei, the ecumenopolis of Croshaw, first extrasolar colony",
);

// ── Chapter heroes ──
export const IMG_CHAPTER = {
  origins:      wiki("3/33/Sol-III%28Earth%29-Cologne.jpg",
                     "Sol-III(Earth)-Cologne.jpg",
                     "Earth seen from orbit"),
  earlyEmpire:  wiki("6/63/UEE-Senate-Chamber-left-wing.png",
                     "UEE-Senate-Chamber-left-wing.png",
                     "UEE Senate Chamber"),
  messerEra:    wiki("1/14/OrionArmitage.jpg",
                     "OrionArmitage.jpg",
                     "Vanduul raid on the Orion system"),
  liberation:   wiki("a/a3/UEE-Senate-Chamber-mural-artwork.png",
                     "UEE-Senate-Chamber-mural-artwork.png",
                     "UEE Senate mural"),
  goldenAge:    wiki("7/75/Area18-AdiraFalls-Tower-Exterior-Daytime.jpg",
                     "Area18-AdiraFalls-Tower-Exterior-Daytime.jpg",
                     "ArcCorp Area18 skyline"),
  currentEra:   wiki("3/35/Pyro-1-orbit-citizencon2022.jpg",
                     "Pyro-1-orbit-citizencon2022.jpg",
                     "Pyro I from orbit"),
};

// ── Race portraits ──
export const IMG_RACE = {
  human:    wiki("4/4c/Sol-III_Aviator.png",
                 "Sol-III_Aviator.png",
                 "UEE Navy aviator"),
  xian:     wiki("1/1d/Xi%27An_helmets_concept.jpg",
                 "Xi'An_helmets_concept.jpg",
                 "Xi'An helmet concept art"),
  banu:     wiki("7/7d/BanuGuildmaster.png",
                 "BanuGuildmaster.png",
                 "Banu Guildmaster"),
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
                 "Earth, cradle of humanity"),
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
                 "Odin, Archon Station"),
};

// ── Additional scene imagery for the expanded flip-book storyline.
//    Each keyed to the event it's meant to illustrate. Text credit is
//    always shown; clicking jumps to the File: page on the wiki. ──
export const IMG_SCENE = {
  // ORIGINS
  croshawCity:      wiki("9/9d/CroshawVannJeleCity.jpg",
                         "CroshawVannJeleCity.jpg",
                         "Vann Jele City, Croshaw, a first-generation colony"),
  croshawAngeli:    wiki("e/e8/CroshawAngeliQuinton.jpg",
                         "CroshawAngeliQuinton.jpg",
                         "Angeli Quinton on Croshaw"),
  solMap:           wiki("2/2b/Sol_system_starmap_2D.jpg",
                         "Sol_system_starmap_2D.jpg",
                         "Sol system starmap"),

  // EARLY EMPIRE
  banuXianVanduul:  wiki("e/e5/Banu%2C_Xi%27An_%26_Vanduul.jpg",
                         "Banu,_Xi'An_&_Vanduul.jpg",
                         "Composite of the three alien civilizations"),
  banuShip:         wiki("9/94/BanuMM1.jpg",
                         "BanuMM1.jpg",
                         "Banu Merchantman"),
  banuEssosouli:    wiki("a/ae/Banu_-_Essosouli_Lin_Sool.png",
                         "Banu_-_Essosouli_Lin_Sool.png",
                         "Banu Essosouli Lin Sool"),
  senateMural:      wiki("a/a3/UEE-Senate-Chamber-mural-artwork.png",
                         "UEE-Senate-Chamber-mural-artwork.png",
                         "UEE Senate Chamber, commemorative mural"),
  messerFamily:     wiki("f/f6/Messer_Family_Tree.png",
                         "Messer_Family_Tree.png",
                         "The Messer family tree"),

  // MESSER ERA
  tevarinHeads:     wiki("f/f7/Tevarin-Heads.jpg",
                         "Tevarin-Heads.jpg",
                         "Tevarin character studies"),
  tevarinService:   wiki("6/6d/Tevarin_war_service_marker_pristine.png",
                         "Tevarin_war_service_marker_pristine.png",
                         "Tevarin War service marker"),
  garronMassacre:   wiki("1/11/GarronIIMassacre.jpg",
                         "GarronIIMassacre.jpg",
                         "The massacre at Garron II"),
  garronVale:       wiki("8/88/GarronVale.png",
                         "GarronVale.png",
                         "Garron Vale, aftermath"),
  uniforms:         wiki("6/68/UEE-Second-Tevarin-War-Uniforms.jpg",
                         "UEE-Second-Tevarin-War-Uniforms.jpg",
                         "UEE Second Tevarin War uniforms"),

  // LIBERATION
  senateLeft:       wiki("6/63/UEE-Senate-Chamber-left-wing.png",
                         "UEE-Senate-Chamber-left-wing.png",
                         "UEE Senate Chamber, post-Messer era"),
  advocacyShip:     wiki("3/3c/AdvocacyCutlass.png",
                         "AdvocacyCutlass.png",
                         "UEE Advocacy Cutlass patrol ship"),

  // GOLDEN AGE
  hurstonMoons:     wiki("6/60/Hurston-Moons.jpg",
                         "Hurston-Moons.jpg",
                         "Hurston and its four moons, Stanton system"),
  microtech:        wiki("e/e7/MicroTech-4.3.jpg",
                         "MicroTech-4.3.jpg",
                         "microTech, corporate home-world"),
  crusader:         wiki("d/d4/Crusader-4.3.jpg",
                         "Crusader-4.3.jpg",
                         "Crusader, cloud-city world"),
  arccorp:          wiki("e/e9/ArcCorp-4.3.jpg",
                         "ArcCorp-4.3.jpg",
                         "ArcCorp, planet-wide megacity"),
  orisonOverview:   wiki("2/26/Orison-Aerial-Overview-3.14.jpg",
                         "Orison-Aerial-Overview-3.14.jpg",
                         "Orison, cloud-city on Crusader"),
  lorville:         wiki("e/e1/Lorville-TeasaSpaceport-Overview-Daytime-Alpha3.17.jpg",
                         "Lorville-TeasaSpaceport-Overview-Daytime-Alpha3.17.jpg",
                         "Lorville, Hurston's capital city"),
  newBabbage:       wiki("c/c8/New_Babbage.jpg",
                         "New_Babbage.jpg",
                         "New Babbage, microTech's capital"),
  area18:           wiki("3/3c/ArcCorp-Area18-CityFlightStation.jpg",
                         "ArcCorp-Area18-CityFlightStation.jpg",
                         "Area18, ArcCorp's primary spaceport"),
  orionArmitage:    wiki("a/ad/OrionArmitageFarStar.jpg",
                         "OrionArmitageFarStar.jpg",
                         "Vanduul clanship over the Orion system"),
  vanduulMask:      wiki("4/4f/Vanduul-mask-challenge-2020-3.11.jpg",
                         "Vanduul-mask-challenge-2020-3.11.jpg",
                         "Vanduul warrior mask"),

  // CURRENT ERA
  pyro3Descent:     wiki("a/ad/Pyro_III_Descent.jpg",
                         "Pyro_III_Descent.jpg",
                         "Descent into Pyro III"),
  pyro3Outpost:     wiki("1/15/Pyro_III_Outpost.jpg",
                         "Pyro_III_Outpost.jpg",
                         "Outpost on Pyro III"),
  pyroCrystals:     wiki("1/17/Pyro-1-surface-crystals-citizencon-2022.jpg",
                         "Pyro-1-surface-crystals-citizencon-2022.jpg",
                         "Pyro I surface crystals"),
  xenothreat:       wiki("5/53/XenothreatScreens_Phase01_122020.jpg",
                         "XenothreatScreens_Phase01_122020.jpg",
                         "Xenothreat faction, pirate coalition"),
  polarisFleet:     wiki("f/f0/Javelin_-_With_fleet_-_Below.jpg",
                         "Javelin_-_With_fleet_-_Below.jpg",
                         "UEE Navy capital ships in formation"),
};
