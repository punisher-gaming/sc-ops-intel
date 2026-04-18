import { Nav } from "./Nav";
import { PatchPill } from "./PatchPill";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <PatchPill />
      <main className="pt-32 pb-16 min-h-screen">{children}</main>
      <footer className="tron-footer">
        PUNISHER GAMING // SC OPS INTEL // UNOFFICIAL — NO AFFILIATION WITH CIG
      </footer>
    </>
  );
}
