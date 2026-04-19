// Narrative pages for the /lore hero flip book — a 12-page comic that
// reads chronologically as a single story rather than a table of
// contents. Each page has:
//   - year (UEE calendar)
//   - title (comic-style headline)
//   - narration (caption-box prose, present-tense)
//   - optional pullQuote (a real or in-character quote)
//   - image (real SC Wiki photo)
//   - optional sfx (one big sound-effect word for action moments)
//   - optional chapterSlug (deep-link to the full chapter when the
//     reader wants to dive in)
//
// Prose is original. Images are credited via LoreImage.

import type { LoreImage } from "./lore-data";
import { IMG_CHAPTER, IMG_RACE, IMG_SYSTEM } from "./lore-images";

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
  {
    year: 2075,
    title: "The Cradle",
    narration:
      "Earth, late twenty-first century. Fusion is solved. The lights stay on. But the planet is full, and humanity, finally, looks up.",
    image: IMG_CHAPTER.origins,
    chapterSlug: "origins",
  },
  {
    year: 2157,
    title: "The First Jump",
    narration:
      "A solo pilot in a modified racer threads a gravitational anomaly. He arrives, dazed, sixty-eight light-years from Sol. The Verse opens.",
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
    image: IMG_CHAPTER.earlyEmpire,
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
    year: 2523,
    title: "The Crown",
    narration:
      "Ivar Messer dissolves the Senate at gunpoint, citing a manufactured Tevarin invasion. The empire will have a face for twenty-five generations, and that face will be his bloodline's.",
    pullQuote: {
      text: "The sacrifice of the few secures the future of the empire.",
      attribution: "Messer doctrine, widely quoted",
    },
    image: IMG_CHAPTER.earlyEmpire,
    sfx: "SEIZED",
    chapterSlug: "messer-era",
  },
  {
    year: 2546,
    title: "First Blood",
    narration:
      "Garron II. Ninety minutes. Half a colony erased in a single orbital pass. The aggressors leave nothing behind to question — not even their ships. Humanity has a new enemy and no name for it.",
    image: IMG_CHAPTER.messerEra,
    sfx: "GARRON FALLS",
    chapterSlug: "messer-era",
  },
  {
    year: 2610,
    title: "The Sin",
    narration:
      "The Tevarin lose the war. Then they lose the homeworld. The Messer regime terraforms Kaleeth into a human paradise and renames it Elysium IV. The diaspora scatters across human space — second-class citizens in a government that took their planet.",
    image: IMG_RACE.tevarin,
    chapterSlug: "messer-era",
  },
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
    year: 2938,
    title: "The Sold System",
    narration:
      "The democratic UEE rebuilds. Trade explodes. The Senate, balancing the Messer-era debt, sells the four habitable planets of the Stanton system to four MegaCorps. Hurston. Crusader. ArcCorp. microTech. Each is a company town the size of a world.",
    image: IMG_CHAPTER.goldenAge,
    chapterSlug: "golden-age",
  },
  {
    year: 2942,
    title: "Orion Burns",
    narration:
      "After centuries of escalating raids, the Vanduul stop being raiders. They take the entire Orion system in one disciplined campaign. Half a million dead. The UEE Navy, finally, accepts that this is no longer a border skirmish.",
    pullQuote: {
      text: "Half a million dead. The dictionary now needs a new word.",
      attribution: "Imperator Costigan, address to the Senate, 2942",
    },
    image: IMG_RACE.vanduul,
    sfx: "ORION FALLS",
    chapterSlug: "golden-age",
  },
  {
    year: 2947,
    title: "The Door Reopens",
    narration:
      "A jump gate sealed by the UEE Navy in 2463 — sealed for four hundred and eighty-four years — opens. Pyro is on the other side: lawless, ungoverned, full of people who do not want to be found. Civilians go through anyway.",
    image: IMG_CHAPTER.currentEra,
    sfx: "PYRO OPEN",
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
