// Narrative pages for the /lore hero flip book — a 32-page chronological
// comic reading as a single story rather than a table of contents.
// Each page is its own comic panel with caption + art + optional
// speech-bubble quote + optional SFX word.
//
// Every page's `year` must also appear as an event on its referenced
// chapter (chapterSlug). If you add a page here, add a matching event
// in lore-data.ts — the test is: a reader flipping through should see
// the exact same year+title when they click into the chapter page.

import type { LoreImage } from "./lore-data";
import { IMG_CHAPTER, IMG_RACE, IMG_SYSTEM, IMG_SCENE } from "./lore-images";

export interface StoryPage {
  year: number;
  title: string;
  narration: string;
  pullQuote?: { text: string; attribution: string };
  image: LoreImage;
  sfx?: string;
  chapterSlug?: string;
}

export const STORY_PAGES: StoryPage[] = [
  // ═══════════ I. ORIGINS (2075 — 2262) ═══════════
  {
    year: 2075,
    title: "The Cradle",
    narration:
      "Earth, late twenty-first century. Fusion is solved. The lights stay on. But the planet is full, and humanity, finally, looks up.",
    image: IMG_CHAPTER.origins,
    chapterSlug: "origins",
  },
  {
    year: 2113,
    title: "The First Colony",
    narration:
      "A generation ship, launched decades earlier, plants a flag on Croshaw. The colonists do not yet know they arrived because of a jump point nobody has mapped.",
    image: IMG_SCENE.croshawCity,
    chapterSlug: "origins",
  },
  {
    year: 2157,
    title: "The First Jump",
    narration:
      "A lone pilot in a modified racer threads a gravitational anomaly. He arrives, dazed, sixty-eight light-years from Sol. The Verse opens.",
    pullQuote: {
      text: "They told me to turn back. I turned further in.",
      attribution: "Nick Croshaw — logbook, 2157",
    },
    image: IMG_SYSTEM.croshaw,
    sfx: "JUMP",
    chapterSlug: "origins",
  },
  {
    year: 2232,
    title: "One Earth",
    narration:
      "Two centuries of resource wars over jump-point access end in a single signature. The United Nations of Earth becomes humanity's first planetary government — and its first empire.",
    image: IMG_SCENE.solMap,
    chapterSlug: "origins",
  },
  {
    year: 2262,
    title: "The Quantum Age",
    narration:
      "The Artemis — humanity's first true FTL ship — makes the Sol–Croshaw run in hours instead of months. The jump-point network goes from curiosity to highway.",
    image: IMG_SCENE.croshawAngeli,
    chapterSlug: "origins",
  },

  // ═══════════ II. EARLY EMPIRE (2262 — 2523) ═══════════
  {
    year: 2380,
    title: "United Planets",
    narration:
      "The UNE restructures into the United Planets of Earth. Power shifts from Earth to Luna. Colonies get real votes for the first time.",
    image: IMG_SCENE.senateMural,
    chapterSlug: "early-empire",
  },
  {
    year: 2438,
    title: "We Are Not Alone",
    narration:
      "A UPE scout strays past an unmapped boundary. The Xi'An have been watching since before our species could speak. They greet us with the patience of a civilization that does not measure time the way we do.",
    pullQuote: {
      text: "We have been aware of you. You have not been aware of us. This is the nature of things.",
      attribution: "First recorded Xi'An transmission, 2438",
    },
    image: IMG_RACE.xian,
    chapterSlug: "early-empire",
  },
  {
    year: 2462,
    title: "The Banu Handshake",
    narration:
      "Where contact with the Xi'An was a chess game, contact with the Banu is a market day. They sell us a discount before they sell us a treaty. Five hundred years later, that treaty still holds.",
    image: IMG_RACE.banu,
    chapterSlug: "early-empire",
  },
  {
    year: 2490,
    title: "The Merchantman Era",
    narration:
      "Banu and human trade routes merge. Banu Merchantmen — famous for hexagonal hulls and swappable module bays — become a common sight in UPE ports. Prosperity, briefly.",
    image: IMG_SCENE.banuShip,
    chapterSlug: "early-empire",
  },
  {
    year: 2523,
    title: "The Crown",
    narration:
      "Ivar Messer dissolves the Senate at gunpoint, citing a manufactured Tevarin invasion. The empire will have a face for twenty-five generations, and that face will be his bloodline's.",
    pullQuote: {
      text: "The sacrifice of the few secures the future of the empire.",
      attribution: "Messer doctrine, widely quoted",
    },
    image: IMG_SCENE.messerFamily,
    sfx: "SEIZED",
    chapterSlug: "messer-era",
  },

  // ═══════════ III. MESSER ERA (2523 — 2792) ═══════════
  {
    year: 2530,
    title: "The Cold War",
    narration:
      "Messer propaganda casts the Xi'An as an existential threat. Both sides militarize the shared border. For four centuries no shot is ever fired — but the threat-posture pays for the regime.",
    image: IMG_SCENE.uniforms,
    chapterSlug: "messer-era",
  },
  {
    year: 2541,
    title: "The Tevarin Invade",
    narration:
      "The Tevarin Prime Empire strikes at the Elysium system. The UEE fleet is unprepared. Early engagements are losses. A young Commodore named Corsen rallies what's left.",
    image: IMG_SCENE.tevarinHeads,
    sfx: "WAR",
    chapterSlug: "messer-era",
  },
  {
    year: 2546,
    title: "First Blood",
    narration:
      "Garron II. Ninety minutes. Half a colony erased in a single orbital pass. The aggressors leave nothing behind to question — not even their ships. Humanity has a new enemy and no name for it.",
    image: IMG_SCENE.garronMassacre,
    sfx: "GARRON FALLS",
    chapterSlug: "messer-era",
  },
  {
    year: 2563,
    title: "Kaleeth Taken",
    narration:
      "After twenty-two years, the First Tevarin War ends in UEE victory. The regime's response is not mercy. The Tevarin homeworld of Kaleeth will be terraformed into a human paradise.",
    image: IMG_SCENE.tevarinService,
    chapterSlug: "messer-era",
  },
  {
    year: 2610,
    title: "The Sin",
    narration:
      "Terraforming completes. The planet is renamed Elysium IV. The surviving Tevarin scatter across human space — a refugee people, second-class citizens in a government that took their world.",
    image: IMG_RACE.tevarin,
    chapterSlug: "messer-era",
  },
  {
    year: 2681,
    title: "Corath'Thal Rises",
    narration:
      "The last Tevarin warlord, Corath'Thal, gathers the diaspora. For one desperate month his fleet retakes Kaleeth. He dies in orbit. The Tevarin never rise again.",
    image: IMG_SCENE.garronVale,
    chapterSlug: "messer-era",
  },
  {
    year: 2789,
    title: "Fair Chance",
    narration:
      "As atonement for the Tevarin, the UEE passes the Fair Chance Act. Any star system containing sapient life — even potentially sapient life — is permanently protected from colonization. It remains the empire's most-cited law.",
    image: IMG_SYSTEM.odin,
    chapterSlug: "messer-era",
  },

  // ═══════════ IV. LIBERATION (2792 — 2920) ═══════════
  {
    year: 2792,
    title: "The March",
    narration:
      "It starts with a civil servant who refuses an order. Then a fleet captain refuses to fire. Then a tram operator refuses to drive. In seventy-two hours the Messer regime has no infrastructure, no military, and nowhere left to flee.",
    pullQuote: {
      text: "We did not vote this government in. We were born into it. We chose to no longer consent.",
      attribution: "Ilsa Messer — final radio address, 2792",
    },
    image: IMG_CHAPTER.liberation,
    sfx: "FREE",
    chapterSlug: "liberation",
  },
  {
    year: 2800,
    title: "First Free Elections",
    narration:
      "Imperator Erin Toi wins a planetary plebiscite — the first in 280 years. The Senate is reconstituted with real powers. The dictatorship becomes a democracy over the span of a single autumn.",
    image: IMG_SCENE.senateLeft,
    chapterSlug: "liberation",
  },
  {
    year: 2872,
    title: "Corath'Thal's Ghost",
    narration:
      "Tevarin rebels — inheritors of the warlord's name — rise one more time. The newly democratic UEE responds not with annihilation but diplomacy. The Tevarin are integrated, not erased. The wound begins to close.",
    image: IMG_SCENE.tevarinService,
    chapterSlug: "liberation",
  },
  {
    year: 2920,
    title: "The Last Messer",
    narration:
      "The final direct-line heir of the Messer dynasty is tried for crimes against humanity and executed. The family name ends after 397 years. Schoolchildren study the trial as the day the UEE closed its longest wound.",
    image: IMG_SCENE.messerFamily,
    chapterSlug: "liberation",
  },

  // ═══════════ V. GOLDEN AGE (2920 — 2942) ═══════════
  {
    year: 2931,
    title: "The Modern UEE",
    narration:
      "The Terran Bill of Rights is signed into law. The modern UEE — constitutional, democratic, navy-loyal — is born. Every Imperator since has been a veteran.",
    image: IMG_SCENE.advocacyShip,
    chapterSlug: "golden-age",
  },
  {
    year: 2938,
    title: "The Sold System",
    narration:
      "The Senate, balancing the Messer-era debt, sells development rights to the four habitable planets of Stanton. Hurston Dynamics. Crusader Industries. ArcCorp. microTech. Each is a company town the size of a world.",
    image: IMG_SCENE.hurstonMoons,
    chapterSlug: "golden-age",
  },
  {
    year: 2938,
    title: "Lorville Rises",
    narration:
      "Hurston Dynamics begins construction of Lorville. It will become the largest city on any corporate-owned world — a soot-black spire built on mining revenue and indentured labor contracts that Hurston refuses to call indentured.",
    image: IMG_SCENE.lorville,
    chapterSlug: "golden-age",
  },
  {
    year: 2940,
    title: "Orison in the Clouds",
    narration:
      "Crusader Industries completes Orison — a floating city-platform suspended in the upper atmosphere of the gas giant Crusader. No ground. Just clouds, and the ships that sell there.",
    image: IMG_SCENE.orisonOverview,
    chapterSlug: "golden-age",
  },
  {
    year: 2941,
    title: "The Ecumenopolis",
    narration:
      "ArcCorp's flagship city, Area18, is declared a planet-wide metropolis. You can fly coast-to-coast and never leave a city. The rest of ArcCorp the world follows the same pattern, paved in panel lights.",
    image: IMG_SCENE.area18,
    chapterSlug: "golden-age",
  },
  {
    year: 2942,
    title: "Orion Burns",
    narration:
      "After centuries of escalating raids, the Vanduul stop being raiders. They take the entire Orion system in one coordinated campaign. Half a million dead. The UEE Navy, finally, accepts that this is no longer a border skirmish.",
    pullQuote: {
      text: "Half a million dead. The dictionary now needs a new word.",
      attribution: "Imperator Costigan — address to the Senate, 2942",
    },
    image: IMG_SCENE.orionArmitage,
    sfx: "ORION FALLS",
    chapterSlug: "golden-age",
  },

  // ═══════════ VI. CURRENT ERA (2942 — 2952) ═══════════
  {
    year: 2944,
    title: "Project Synthesis",
    narration:
      "UEE R&D formally launches an effort to reverse-engineer captured Vanduul clan-ship technology. Results are classified. Rumors persist of breakthroughs that have not yet reached the fleet.",
    image: IMG_SCENE.polarisFleet,
    chapterSlug: "current-era",
  },
  {
    year: 2947,
    title: "The Door Reopens",
    narration:
      "A jump gate sealed by the UEE Navy in 2463 — sealed for four hundred and eighty-four years — opens. Pyro is on the other side: lawless, ungoverned, full of people who do not want to be found. Civilians go through anyway.",
    image: IMG_SCENE.pyro3Descent,
    sfx: "PYRO OPEN",
    chapterSlug: "current-era",
  },
  {
    year: 2950,
    title: "Xenothreat",
    narration:
      "A coalition of Pyrotechnic pirates and ex-military hardliners — calling themselves Xenothreat — launches coordinated attacks on Stanton–Pyro traffic. The Navy answers. The conflict is ongoing.",
    image: IMG_SCENE.xenothreat,
    sfx: "XENOTHREAT",
    chapterSlug: "current-era",
  },
  {
    year: 2952,
    title: "Pyro Official",
    narration:
      "The UEE formally declares the Pyro system fully charted. Civilian presence is discouraged but no longer illegal. New citizens arrive daily — some to build outposts, most to disappear.",
    image: IMG_SCENE.pyro3Outpost,
    chapterSlug: "current-era",
  },
  {
    year: 2952,
    title: "You Arrive",
    narration:
      "The map is not finished. New jump points are being charted monthly. New species have been hinted at in classified Navy reports that journalists keep leaking. The next chapter of this history is yours to write.",
    pullQuote: {
      text: "o7, citizen. The stars are open.",
      attribution: "Standard UEE Navy enlistment closing",
    },
    image: IMG_RACE.human,
    chapterSlug: "current-era",
  },
];
