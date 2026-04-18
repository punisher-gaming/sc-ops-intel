// PREVIEW ONLY — standalone mobiGlas-styled mockup of a Blueprints page.
// Hardcoded sample data, no database, no auth. Fully self-contained so it
// won't crash preview deployments even if env vars are missing.
//
// Style direction:
//   - near-black background with very subtle radial vignette
//   - single cyan accent (#4dd9ff), white text, muted gray for secondary
//   - thin 1px frames, rounded corners (4px — not pill)
//   - crisp geometric sans-serif (Inter via layout.tsx)
//   - generous padding, lots of breathing room
//   - NO scanlines, NO CRT, NO mixed neon palette
//   - Punisher skull reduced to a small corner mark in nav

"use client";

import { useMemo, useState } from "react";

type Blueprint = {
  id: string;
  name: string;
  type: "Weapon" | "Component" | "Armor" | "Consumable";
  grade: "1" | "2" | "3" | "4";
  manufacturer: string;
  craftTimeMin: number;
  sources: string[];
  materials: { group: string; count: number }[];
};

const SAMPLE: Blueprint[] = [
  {
    id: "bp1",
    name: "FS-9 LMG",
    type: "Weapon",
    grade: "1",
    manufacturer: "Behring",
    craftTimeMin: 4,
    sources: ["Mission Reward: Citizens For Prosperity"],
    materials: [
      { group: "Frame", count: 1 },
      { group: "Barrel", count: 1 },
      { group: "Grip", count: 1 },
    ],
  },
  {
    id: "bp2",
    name: "P4-AR Rifle",
    type: "Weapon",
    grade: "2",
    manufacturer: "Klaus & Werner",
    craftTimeMin: 6,
    sources: ["Shop: Cubby Blast (Port Olisar)", "Mission Reward: BH Phase 3"],
    materials: [
      { group: "Frame", count: 1 },
      { group: "Barrel", count: 1 },
      { group: "Optics", count: 1 },
    ],
  },
  {
    id: "bp3",
    name: "Paladin Shield Generator",
    type: "Component",
    grade: "3",
    manufacturer: "Gorgon Defender Industries",
    craftTimeMin: 22,
    sources: ["Shop: Platinum Bay (Everus Harbor)"],
    materials: [
      { group: "Emitter", count: 2 },
      { group: "Capacitor", count: 1 },
      { group: "Chassis", count: 1 },
    ],
  },
  {
    id: "bp4",
    name: "Pembroke Armor (Heavy)",
    type: "Armor",
    grade: "2",
    manufacturer: "CDS",
    craftTimeMin: 14,
    sources: ["Drop: 9Tails Lockdown"],
    materials: [
      { group: "Plating", count: 4 },
      { group: "Weave", count: 2 },
      { group: "Harness", count: 1 },
    ],
  },
  {
    id: "bp5",
    name: "MedPen Mk III",
    type: "Consumable",
    grade: "1",
    manufacturer: "CureLife",
    craftTimeMin: 1,
    sources: ["Shop: Med clinics (any)"],
    materials: [{ group: "Compound", count: 1 }],
  },
  {
    id: "bp6",
    name: "Arrowhead Sniper Rifle",
    type: "Weapon",
    grade: "4",
    manufacturer: "Klaus & Werner",
    craftTimeMin: 35,
    sources: [
      "Mission Reward: XenoThreat (rare)",
      "Drop: Pyro bunkers",
    ],
    materials: [
      { group: "Frame", count: 1 },
      { group: "Barrel", count: 1 },
      { group: "Optics", count: 1 },
      { group: "Rare Alloy", count: 2 },
    ],
  },
];

const TYPES = ["Weapon", "Component", "Armor", "Consumable"] as const;
const GRADES = ["1", "2", "3", "4"] as const;

export default function MobiPreview() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [selected, setSelected] = useState<Blueprint>(SAMPLE[0]);

  const filtered = useMemo(() => {
    return SAMPLE.filter((b) => {
      if (type && b.type !== type) return false;
      if (grade && b.grade !== grade) return false;
      if (q) {
        const hay = `${b.name} ${b.manufacturer} ${b.type}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [q, type, grade]);

  return (
    <div className="min-h-screen bg-[#05070d] text-[#e6ecf2]">
      {/* subtle radial vignette */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(77,217,255,0.06) 0%, transparent 60%)",
        }}
      />

      {/* nav */}
      <nav className="relative border-b border-white/5 backdrop-blur-sm bg-[#05070d]/80 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center gap-8">
          <div className="flex items-center gap-3">
            <MiniSkull />
            <div className="font-semibold tracking-tight text-lg">
              SC OPS <span className="text-[#4dd9ff]">INTEL</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/60">
            <NavLink active>Blueprints</NavLink>
            <NavLink>Resources</NavLink>
            <NavLink>Crafting</NavLink>
            <NavLink>Commodities</NavLink>
            <NavLink>Ships</NavLink>
            <NavLink>Weapons</NavLink>
            <NavLink>Components</NavLink>
            <NavLink>Notes</NavLink>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="text-white/40">Patch</span>
            <span className="px-2 py-1 rounded border border-[#4dd9ff]/30 text-[#4dd9ff] font-mono">
              4.7.1
            </span>
            <button className="ml-2 px-4 py-1.5 text-sm bg-[#4dd9ff] text-[#05070d] font-semibold rounded hover:bg-[#7ae3ff] transition-colors">
              Sign in
            </button>
          </div>
        </div>
      </nav>

      {/* header */}
      <div className="relative max-w-[1400px] mx-auto px-8 pt-10 pb-6">
        <div className="text-xs uppercase tracking-[0.2em] text-[#4dd9ff]/70 mb-2">
          Catalog
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">Blueprints</h1>
        <p className="text-white/50 mt-2 max-w-2xl">
          Every crafting recipe in the 'verse. Filter by type, grade, or
          manufacturer. Click any blueprint to see required materials and where
          to get it.
        </p>
      </div>

      {/* main layout */}
      <div className="relative max-w-[1400px] mx-auto px-8 pb-16 grid gap-6" style={{ gridTemplateColumns: "1fr 420px" }}>
        {/* LEFT: list */}
        <section>
          {/* filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search blueprints…"
              className="flex-1 min-w-[240px] h-10 px-4 rounded bg-white/5 border border-white/10 text-sm placeholder:text-white/30 focus:outline-none focus:border-[#4dd9ff]/60 focus:bg-white/10 transition-colors"
            />
            <FilterChip label="All Types" value={type} setValue={setType} options={TYPES as unknown as string[]} />
            <FilterChip label="All Grades" value={grade} setValue={setGrade} options={GRADES as unknown as string[]} />
          </div>

          <div className="text-xs text-white/40 mb-3">
            {filtered.length} of {SAMPLE.length}
          </div>

          {/* table */}
          <div className="rounded-lg border border-white/10 overflow-hidden bg-white/[0.02]">
            <div className="grid grid-cols-[1fr_100px_70px_90px] gap-4 px-4 py-3 text-xs uppercase tracking-wider text-white/40 border-b border-white/10 bg-white/[0.02]">
              <div>Name</div>
              <div>Type</div>
              <div>Grade</div>
              <div className="text-right">Craft</div>
            </div>
            {filtered.map((b) => {
              const active = selected.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className={`w-full grid grid-cols-[1fr_100px_70px_90px] gap-4 px-4 py-3.5 text-left border-b border-white/5 last:border-b-0 transition-colors ${
                    active
                      ? "bg-[#4dd9ff]/10"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div>
                    <div className={`text-sm font-medium ${active ? "text-[#4dd9ff]" : "text-white"}`}>
                      {b.name}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">{b.manufacturer}</div>
                  </div>
                  <div className="text-sm text-white/70 self-center">{b.type}</div>
                  <div className="self-center">
                    <GradeBadge grade={b.grade} />
                  </div>
                  <div className="text-sm text-white/70 self-center text-right font-mono">
                    {b.craftTimeMin}m
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-4 py-12 text-center text-white/30 text-sm">
                No blueprints match these filters.
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: detail */}
        <aside>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 sticky top-24">
            <div className="text-xs uppercase tracking-wider text-[#4dd9ff]/70 mb-1">
              {selected.type} • Grade {selected.grade}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">{selected.name}</h2>
            <div className="text-sm text-white/50 mt-1">{selected.manufacturer}</div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <StatBox label="Craft Time" value={`${selected.craftTimeMin} min`} />
              <StatBox label="Grade" value={selected.grade} />
            </div>

            <SectionLabel>Required Materials</SectionLabel>
            <ul className="space-y-2">
              {selected.materials.map((m) => (
                <li
                  key={m.group}
                  className="flex items-center justify-between px-3 py-2.5 rounded bg-white/[0.03] border border-white/5 text-sm"
                >
                  <span className="text-white/80">{m.group}</span>
                  <span className="text-[#4dd9ff] font-mono">×{m.count}</span>
                </li>
              ))}
            </ul>

            <SectionLabel>Known Sources</SectionLabel>
            <ul className="space-y-2">
              {selected.sources.map((s) => (
                <li
                  key={s}
                  className="px-3 py-2.5 rounded bg-white/[0.03] border border-white/5 text-sm text-white/80"
                >
                  {s}
                </li>
              ))}
            </ul>

            <button className="mt-6 w-full h-10 rounded bg-[#4dd9ff] text-[#05070d] font-semibold text-sm hover:bg-[#7ae3ff] transition-colors">
              Log Field Intel
            </button>
            <div className="text-xs text-white/30 text-center mt-2">
              Signed-in users only
            </div>
          </div>
        </aside>
      </div>

      {/* footer */}
      <footer className="relative border-t border-white/5 py-8 text-center text-xs text-white/30 tracking-wider">
        PUNISHER GAMING · SC OPS INTEL · UNOFFICIAL — NO AFFILIATION WITH CIG
      </footer>
    </div>
  );
}

function NavLink({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`cursor-pointer transition-colors ${
        active ? "text-white" : "hover:text-white"
      }`}
    >
      {children}
    </span>
  );
}

function FilterChip({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="h-10 px-3 rounded bg-white/5 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-[#4dd9ff]/60"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    "1": "bg-white/10 text-white/70 border-white/20",
    "2": "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
    "3": "bg-[#4dd9ff]/10 text-[#4dd9ff] border-[#4dd9ff]/30",
    "4": "bg-amber-400/10 text-amber-300 border-amber-400/30",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-mono rounded border ${colors[grade]}`}>
      G{grade}
    </span>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/[0.03] border border-white/5 px-3 py-2.5">
      <div className="text-xs uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-[0.18em] text-white/40 mt-6 mb-3">
      {children}
    </div>
  );
}

function MiniSkull() {
  // tiny simplified skull — white on transparent, 24px
  return (
    <svg width="24" height="24" viewBox="0 0 200 200" aria-hidden="true">
      <path
        d="M 45,50 C 45,14 70,8 100,8 C 130,8 155,14 155,50 L 155,76 Q 153,89 140,96 Q 156,106 156,118 Q 152,130 138,138 L 138,196 L 62,196 L 62,138 Q 48,130 44,118 Q 44,106 60,96 Q 47,89 45,76 Z"
        fill="#e6ecf2"
      />
      <path d="M 55,48 L 89,60 L 93,84 L 55,76 Q 44,62 55,48 Z" fill="#05070d" />
      <path d="M 145,48 L 111,60 L 107,84 L 145,76 Q 156,62 145,48 Z" fill="#05070d" />
      <path d="M 100,98 Q 94,110 96,122 Q 100,126 104,122 Q 106,110 100,98 Z" fill="#05070d" />
      <rect x="75" y="142" width="4" height="54" fill="#05070d" />
      <rect x="90" y="142" width="4" height="54" fill="#05070d" />
      <rect x="105" y="142" width="4" height="54" fill="#05070d" />
      <rect x="120" y="142" width="4" height="54" fill="#05070d" />
    </svg>
  );
}
