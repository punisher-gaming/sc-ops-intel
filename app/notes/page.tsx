import { PageShell } from "@/components/PageShell";
import Link from "next/link";

export default function NotesPage() {
  return (
    <PageShell>
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="divider">
          <div className="bar" />
          <div className="label">USER TERMINAL :: NOTES</div>
          <div className="bar" />
        </div>
        <div className="tron-card mt-8">
          <div
            className="font-mono text-bone"
            style={{ fontSize: "1.1rem", lineHeight: 1.8, letterSpacing: "0.06em" }}
          >
            <div className="text-phosphor mb-4">&gt; authentication required</div>
            <p className="text-bone/70 mb-6 font-sans" style={{ letterSpacing: 0, fontSize: "1rem" }}>
              Notes are private and only accessible to you. Create an account or log in to save
              loadouts, mission strategies, crafting recipes, and reminders tied to any ship,
              weapon, or blueprint.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/login" className="btn btn-primary">Log In</Link>
              <Link href="/signup" className="btn btn-secondary">Create Account</Link>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
