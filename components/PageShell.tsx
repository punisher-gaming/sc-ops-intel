import { Nav } from "./Nav";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="relative min-h-screen pb-16">{children}</main>
      <footer className="site-footer">
        <div>CITIZENDEX · Unofficial — no affiliation with CIG</div>
        <div style={{ marginTop: 4, fontSize: "0.72rem", color: "var(--text-dim)" }}>
          Hosted by <strong>Punisher Gaming</strong>
        </div>
      </footer>
    </>
  );
}
