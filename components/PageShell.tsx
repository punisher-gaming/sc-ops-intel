import { Nav } from "./Nav";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="relative min-h-screen pb-16">{children}</main>
      <footer className="site-footer">
        Punisher Gaming · SC OPS INTEL · Unofficial — no affiliation with CIG
      </footer>
    </>
  );
}
