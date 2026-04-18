import { CURRENT_PATCH } from "./PatchPill";

export function CatalogStub({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
  phase?: number;
}) {
  return (
    <div className="container-wide">
      <div className="page-header">
        <div className="accent-label">Catalog</div>
        <h1>{title}</h1>
        <p>{blurb}</p>
      </div>

      <div className="card" style={{ padding: "2rem", marginTop: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span className="badge badge-warn">Coming Soon</span>
          <span className="label-mini">Patch {CURRENT_PATCH}</span>
        </div>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.6, maxWidth: "60ch" }}>
          This section is still being built. The data pipeline is running
          nightly; the browsing UI lands in the next update.
        </p>
      </div>
    </div>
  );
}
