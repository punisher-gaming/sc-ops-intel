import { CURRENT_PATCH } from "./PatchPill";

export function CatalogStub({
  title,
  blurb,
  phase = 3,
}: {
  title: string;
  blurb: string;
  phase?: number;
}) {
  return (
    <div className="max-w-[1200px] mx-auto px-8">
      <div className="divider">
        <div className="bar" />
        <div className="label">{title}</div>
        <div className="bar" />
      </div>

      <div className="tron-card mt-8">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="font-display font-black text-3xl"
            style={{ letterSpacing: "0.12em", textShadow: "0 0 16px rgba(0,229,255,0.5)" }}
          >
            {title}
          </div>
          <div
            className="font-mono border border-amber text-amber px-2 py-0.5"
            style={{ letterSpacing: "0.2em", fontSize: "0.9rem" }}
          >
            SYNCING {CURRENT_PATCH}
          </div>
        </div>

        <p className="text-bone/70 leading-relaxed max-w-[68ch] mb-6">{blurb}</p>

        <div
          className="font-mono text-phosphor p-4 border border-dashed"
          style={{
            borderColor: "rgba(0,255,127,0.3)",
            background: "rgba(0,255,127,0.04)",
            letterSpacing: "0.1em",
          }}
        >
          &gt; data ingest :: PHASE {phase}
          <br />
          &gt; status :: in development
          <br />
          &gt; check back after 4.7.2 lands
        </div>
      </div>
    </div>
  );
}
