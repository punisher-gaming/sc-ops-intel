import Link from "next/link";
import { RACES } from "@/lib/lore-data";

export default function RacesIndex() {
  return (
    <>
      <section className="lore-hero" style={{ minHeight: "40vh" }}>
        <div className="lore-hero-eyebrow">◢ Sapient Species</div>
        <h1 className="lore-hero-title">Who&apos;s Out There</h1>
        <p className="lore-hero-body">
          Five named species share known space. Most are friendly, one
          isn&apos;t talking, and the silence between contacts is filled
          with civilizations we have not met yet.
        </p>
      </section>
      <div className="lore-species-grid">
        {RACES.map((r) => (
          <Link
            key={r.slug}
            href={`/lore/race/${r.slug}`}
            className={`lore-species-card accent-${r.accent}`}
          >
            <div className="lore-card-glyph" aria-hidden>{r.glyph}</div>
            <div className="lore-card-name">{r.name}</div>
            <div className="lore-card-sub">{r.subtitle}</div>
            <div className="lore-card-meta">
              {r.relationship} · Home: {r.homeSystem}
            </div>
            <p className="lore-card-blurb">{r.blurb}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
