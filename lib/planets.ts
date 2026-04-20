// Static catalog of Stanton + Pyro celestial bodies. Source: Star Citizen
// Wiki + scunpacked. Numbers are flavour-correct but the game's tuning
// shifts patch-to-patch, treat anything inside ±10% as ground truth.
//
// We keep this as a hand-curated list (vs. trying to pull from the wiki
// API at build time) because the dataset is small (~30 bodies), changes
// rarely, and the ticker needs instant data on first paint.

export type WeatherKind =
  | "clear"
  | "storms"
  | "blizzard"
  | "dust"
  | "ash"
  | "rain"
  | "fog"
  | "vacuum"
  | "radiation"
  | "lava";

export type BodyType = "planet" | "moon" | "dwarf" | "asteroid";

export interface CelestialBody {
  slug: string;
  name: string;
  system: "Stanton" | "Pyro";
  type: BodyType;
  parent?: string;     // parent planet name for moons
  // Atmospheric / environmental
  habitable: boolean;
  atmosphere: string;  // human description, e.g. "Breathable, Earth-like"
  /** Temperature range in Celsius. Surface average. */
  tempC: { low: number; high: number };
  /** Approximate surface gravity in g (Earth = 1.0). */
  gravityG: number;
  /** Sidereal day in standard hours. */
  dayHours: number;
  /** Dominant current weather kind, drives the ticker icon + tone. */
  weather: WeatherKind;
  /** One-line weather descriptor for the ticker. */
  weatherText: string;
  /** Featured landing zones / outposts. */
  landingZones: string[];
  /** One-paragraph blurb for the detail page. */
  blurb: string;
  /** Wiki image URL (CC BY-SA via SC Wiki). Optional. */
  image?: string;
}

export const BODIES: CelestialBody[] = [
  // ── STANTON ───────────────────────────────────────────────────────
  {
    slug: "hurston",
    name: "Hurston",
    system: "Stanton",
    type: "planet",
    habitable: true,
    atmosphere: "Toxic, industrially polluted",
    tempC: { low: -8, high: 41 },
    gravityG: 1.05,
    dayHours: 27,
    weather: "storms",
    weatherText: "Acid rain over Lorville",
    landingZones: ["Lorville", "Teasa Spaceport", "HDMS-Pinewood", "HDMS-Stanhope"],
    blurb:
      "Owned wholesale by Hurston Dynamics. Ash-grey skies, scarred badlands, and the pinprick lights of HDMS mining outposts. Lorville's Central Business District is the only patch of green left.",
  },
  {
    slug: "arial",
    name: "Arial",
    system: "Stanton",
    type: "moon",
    parent: "Hurston",
    habitable: false,
    atmosphere: "Trace CO₂",
    tempC: { low: -88, high: 22 },
    gravityG: 0.21,
    dayHours: 19,
    weather: "dust",
    weatherText: "Light particulate haze",
    landingZones: ["HDMS-Bezdek", "HDMS-Lathan"],
    blurb: "Largest of Hurston's moons. Iron-rich regolith and a permanent ochre haze from Hurston's industrial outflow.",
  },
  {
    slug: "aberdeen",
    name: "Aberdeen",
    system: "Stanton",
    type: "moon",
    parent: "Hurston",
    habitable: false,
    atmosphere: "Sulphuric, corrosive",
    tempC: { low: 18, high: 137 },
    gravityG: 0.18,
    dayHours: 18,
    weather: "ash",
    weatherText: "Sulphur ashfall, +137°C peak",
    landingZones: ["HDMS-Anderson", "HDMS-Norgaard"],
    blurb: "Hurston Dynamics' chemical-weapons testing range. Daytime surface temperatures cook unshielded armour in minutes.",
  },
  {
    slug: "magda",
    name: "Magda",
    system: "Stanton",
    type: "moon",
    parent: "Hurston",
    habitable: false,
    atmosphere: "Trace, near-vacuum",
    tempC: { low: -158, high: -41 },
    gravityG: 0.16,
    dayHours: 22,
    weather: "vacuum",
    weatherText: "Calm, near-vacuum",
    landingZones: ["HDMS-Hahn", "HDMS-Perlman"],
    blurb: "Cold, quiet, and rich in tungsten. Long-shift miners come here for the silence.",
  },
  {
    slug: "ita",
    name: "Ita",
    system: "Stanton",
    type: "moon",
    parent: "Hurston",
    habitable: false,
    atmosphere: "Thin nitrogen",
    tempC: { low: -120, high: -28 },
    gravityG: 0.17,
    dayHours: 17,
    weather: "fog",
    weatherText: "Thin nitrogen fog",
    landingZones: ["HDMS-Ryder", "HDMS-Woodruff"],
    blurb: "Tidally-locked smallest moon. The dark side stays at -120°C year-round.",
  },
  {
    slug: "crusader",
    name: "Crusader",
    system: "Stanton",
    type: "planet",
    habitable: true,
    atmosphere: "Hydrogen-helium, breathable in upper layers",
    tempC: { low: -40, high: 18 },
    gravityG: 0.95,
    dayHours: 108,
    weather: "storms",
    weatherText: "Cloud-deck turbulence, Orison serene",
    landingZones: ["Orison", "Seraphim Station", "August Dunlow Spaceport"],
    blurb: "A pale-blue gas giant. Orison's platform-cities ride the upper cloud deck where the air is breathable and the sunsets last an hour.",
  },
  {
    slug: "cellin",
    name: "Cellin",
    system: "Stanton",
    type: "moon",
    parent: "Crusader",
    habitable: false,
    atmosphere: "Trace argon",
    tempC: { low: -103, high: 15 },
    gravityG: 0.21,
    dayHours: 14,
    weather: "dust",
    weatherText: "Drifting regolith, calm",
    landingZones: ["Gallete Family Farms", "Hickes Research Outpost", "Tram & Myers Mining"],
    blurb: "Pale tan moon with low rolling hills. Popular for new-pilot bunker runs.",
  },
  {
    slug: "daymar",
    name: "Daymar",
    system: "Stanton",
    type: "moon",
    parent: "Crusader",
    habitable: false,
    atmosphere: "Thin CO₂",
    tempC: { low: -68, high: 4 },
    gravityG: 0.25,
    dayHours: 21,
    weather: "dust",
    weatherText: "Persistent dust drift",
    landingZones: ["Shubin SAL-2", "Bountiful Harvest Hydroponics", "Kudre Ore"],
    blurb: "Rust-orange flats and rolling dunes. The site of the legendary Daymar Rally, a 350km open-rover circuit.",
  },
  {
    slug: "yela",
    name: "Yela",
    system: "Stanton",
    type: "moon",
    parent: "Crusader",
    habitable: false,
    atmosphere: "Trace methane",
    tempC: { low: -163, high: -78 },
    gravityG: 0.21,
    dayHours: 30,
    weather: "blizzard",
    weatherText: "Ice-particle whiteout",
    landingZones: ["GrimHEX", "Benson Mining", "Deakins Research"],
    blurb: "Frozen moon ringed by an asteroid belt, perfect cover for the GrimHEX outlaw station carved into a hollowed-out rock.",
  },
  {
    slug: "arccorp",
    name: "ArcCorp",
    system: "Stanton",
    type: "planet",
    habitable: true,
    atmosphere: "Engineered, breathable",
    tempC: { low: 12, high: 35 },
    gravityG: 1.0,
    dayHours: 24,
    weather: "clear",
    weatherText: "Neon-lit, smog-warm",
    landingZones: ["Area18", "Riker Memorial Spaceport", "Baijini Point"],
    blurb: "A planet-wide city. ArcCorp paved every continent. Skyline lights are visible from low orbit; ground-level air is recycled.",
  },
  {
    slug: "lyria",
    name: "Lyria",
    system: "Stanton",
    type: "moon",
    parent: "ArcCorp",
    habitable: false,
    atmosphere: "Thin CO₂, trace water vapor",
    tempC: { low: -94, high: -22 },
    gravityG: 0.22,
    dayHours: 18,
    weather: "blizzard",
    weatherText: "Glacial winds, -94°C lows",
    landingZones: ["Shubin SMCa-6", "Loveridge Mineral Reserve", "Humboldt Mines"],
    blurb: "Glacier-coated moon. Half the surface is permanent ice; the other half is gravel mining claims.",
  },
  {
    slug: "wala",
    name: "Wala",
    system: "Stanton",
    type: "moon",
    parent: "ArcCorp",
    habitable: false,
    atmosphere: "Trace, near-vacuum",
    tempC: { low: -141, high: -40 },
    gravityG: 0.19,
    dayHours: 16,
    weather: "vacuum",
    weatherText: "Cold and still",
    landingZones: ["ArcCorp Mining 045", "ArcCorp Mining 141", "Samson & Son's Salvage"],
    blurb: "Pale-grey moon dotted with ArcCorp mining stations. Salvage shop in the southern hemisphere is a favourite tutorial stop.",
  },
  {
    slug: "microtech",
    name: "microTech",
    system: "Stanton",
    type: "planet",
    habitable: true,
    atmosphere: "Breathable, frigid",
    tempC: { low: -81, high: 4 },
    gravityG: 0.93,
    dayHours: 24,
    weather: "blizzard",
    weatherText: "New Babbage at -41°C, snow",
    landingZones: ["New Babbage", "Shubin Interstellar HQ", "Rayari Anvik"],
    blurb: "Snow-globe planet. Crystal-clear domes shelter New Babbage and the rest of microTech's gleaming research campuses.",
  },
  {
    slug: "calliope",
    name: "Calliope",
    system: "Stanton",
    type: "moon",
    parent: "microTech",
    habitable: false,
    atmosphere: "Thin nitrogen",
    tempC: { low: -178, high: -89 },
    gravityG: 0.19,
    dayHours: 20,
    weather: "blizzard",
    weatherText: "Persistent ice storms",
    landingZones: ["Rayari Deltana", "Shubin SMCa-8", "Rayari Kaltag"],
    blurb: "Brown ice-rock moon. Rayari's biotech labs make use of the cryogenic conditions for sample preservation.",
  },
  {
    slug: "clio",
    name: "Clio",
    system: "Stanton",
    type: "moon",
    parent: "microTech",
    habitable: false,
    atmosphere: "Trace methane",
    tempC: { low: -195, high: -110 },
    gravityG: 0.18,
    dayHours: 24,
    weather: "fog",
    weatherText: "Methane fog banks",
    landingZones: ["Rayari Cantwell", "Shubin SMCa-6"],
    blurb: "Smaller of microTech's frozen moons. Stargazers love it, clearest skies in Stanton when the methane lifts.",
  },
  {
    slug: "euterpe",
    name: "Euterpe",
    system: "Stanton",
    type: "moon",
    parent: "microTech",
    habitable: false,
    atmosphere: "Trace CO₂",
    tempC: { low: -158, high: -64 },
    gravityG: 0.20,
    dayHours: 22,
    weather: "dust",
    weatherText: "Frost-rimed dust drift",
    landingZones: ["Devlin Scrap & Salvage", "Bud's Growery"],
    blurb: "Off-grid pocket of microTech. Devlin's scrapyard buys anything that flies and a lot that doesn't.",
  },
  {
    slug: "aaron-halo",
    name: "Aaron Halo",
    system: "Stanton",
    type: "asteroid",
    habitable: false,
    atmosphere: "Vacuum",
    tempC: { low: -240, high: -100 },
    gravityG: 0.0,
    dayHours: 0,
    weather: "vacuum",
    weatherText: "Mineral-rich asteroid belt",
    landingZones: [],
    blurb:
      "Dense ring of asteroids encircling Stanton between Crusader and ArcCorp. Quantanium, agricium, and laranite, if you can dodge the rocks long enough to scan one.",
  },

  // ── PYRO ──────────────────────────────────────────────────────────
  {
    slug: "pyro-i",
    name: "Pyro I",
    system: "Pyro",
    type: "planet",
    habitable: false,
    atmosphere: "None, surface boils off",
    tempC: { low: 280, high: 480 },
    gravityG: 0.32,
    dayHours: 38,
    weather: "lava",
    weatherText: "Sun-side surface molten",
    landingZones: [],
    blurb: "Innermost rock of Pyro. The sun-facing hemisphere is liquid stone; the dark side is a shattered crust still warm enough to glow.",
  },
  {
    slug: "monox",
    name: "Monox",
    system: "Pyro",
    type: "planet",
    habitable: false,
    atmosphere: "Carbon monoxide, dense",
    tempC: { low: 92, high: 188 },
    gravityG: 0.81,
    dayHours: 46,
    weather: "ash",
    weatherText: "CO ash storms, +188°C peak",
    landingZones: ["Patch City"],
    blurb: "Choked in carbon monoxide. Patch City clings to a rare cool basin and trades survival gear for anything you can scavenge from the ash flats.",
  },
  {
    slug: "bloom",
    name: "Bloom",
    system: "Pyro",
    type: "planet",
    habitable: false,
    atmosphere: "Hydrogen sulfide",
    tempC: { low: -8, high: 64 },
    gravityG: 0.94,
    dayHours: 31,
    weather: "fog",
    weatherText: "Sulphurous fog, faint algal glow",
    landingZones: ["Endgame"],
    blurb: "The closest Pyro has to a habitable world. Sulphur fog hangs in the lowlands; the highland rim hosts Endgame, a frontier outpost run by anarchists.",
  },
  {
    slug: "pyro-iv",
    name: "Pyro IV",
    system: "Pyro",
    type: "planet",
    habitable: false,
    atmosphere: "Hydrogen-helium gas giant",
    tempC: { low: -110, high: 38 },
    gravityG: 1.85,
    dayHours: 14,
    weather: "storms",
    weatherText: "Lightning bands, 380 km/h winds",
    landingZones: [],
    blurb: "Massive banded gas giant. Twin storms locked at the equator have rolled around the planet for centuries.",
  },
  {
    slug: "terminus",
    name: "Terminus",
    system: "Pyro",
    type: "planet",
    habitable: false,
    atmosphere: "Thin nitrogen, irradiated",
    tempC: { low: -47, high: 22 },
    gravityG: 0.78,
    dayHours: 28,
    weather: "radiation",
    weatherText: "Persistent radiation flux",
    landingZones: ["Rod's Fuel 'N Supplies", "Checkmate Station"],
    blurb: "Pyro's frontier favourite. Long days, mild temps, but a steady solar dose, radmeds are part of the kit.",
  },
  {
    slug: "pyro-vi",
    name: "Pyro VI",
    system: "Pyro",
    type: "planet",
    habitable: false,
    atmosphere: "Methane-ammonia ice",
    tempC: { low: -198, high: -120 },
    gravityG: 1.12,
    dayHours: 41,
    weather: "blizzard",
    weatherText: "Methane snow, perpetual",
    landingZones: ["Rustville"],
    blurb: "Frozen rim-world. Rustville's prefab huts cling to a thawed geothermal vent, the only liquid water in the system.",
  },
  {
    slug: "ruin-station",
    name: "Ruin Station",
    system: "Pyro",
    type: "asteroid",
    habitable: false,
    atmosphere: "Pressurised interior",
    tempC: { low: 18, high: 22 },
    gravityG: 0.0,
    dayHours: 0,
    weather: "vacuum",
    weatherText: "Headquarters of the Headhunters",
    landingZones: ["Ruin Station"],
    blurb: "Outlaw waystation built into a hollowed asteroid. The Headhunters guild runs the bar, the docks, and most of the contracts.",
  },
];

export function getBody(slug: string): CelestialBody | undefined {
  return BODIES.find((b) => b.slug === slug);
}

export function bodiesBySystem(system: "Stanton" | "Pyro"): CelestialBody[] {
  return BODIES.filter((b) => b.system === system);
}

export function weatherIcon(w: WeatherKind): string {
  switch (w) {
    case "clear": return "☀";
    case "storms": return "⛈";
    case "blizzard": return "❄";
    case "dust": return "🌫";
    case "ash": return "🌋";
    case "rain": return "🌧";
    case "fog": return "🌁";
    case "vacuum": return "🌑";
    case "radiation": return "☢";
    case "lava": return "🔥";
  }
}

export function weatherTone(w: WeatherKind): string {
  // CSS colour hint per weather kind, drives the ticker pill border.
  switch (w) {
    case "clear": return "#facc15";
    case "storms": return "#60a5fa";
    case "blizzard": return "#7dd3fc";
    case "dust": return "#d6a55a";
    case "ash": return "#f87171";
    case "rain": return "#60a5fa";
    case "fog": return "#cbd5e1";
    case "vacuum": return "#94a3b8";
    case "radiation": return "#a3e635";
    case "lava": return "#fb923c";
  }
}
