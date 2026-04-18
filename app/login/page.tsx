import { PageShell } from "@/components/PageShell";
import Link from "next/link";

export default function LoginPage() {
  return (
    <PageShell>
      <div className="max-w-[500px] mx-auto px-8">
        <div className="divider">
          <div className="bar" />
          <div className="label">LOG IN</div>
          <div className="bar" />
        </div>
        <div className="tron-card mt-8">
          <p className="text-bone/70 mb-6">
            Logging in is optional. Only needed to save notes, recipes, and your RSI handle.
          </p>
          <form className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="email"
              className="px-4 py-3 font-mono text-lg bg-transparent border border-cyan/30 text-bone placeholder:text-bone/30"
              disabled
            />
            <input
              type="password"
              placeholder="password"
              className="px-4 py-3 font-mono text-lg bg-transparent border border-cyan/30 text-bone placeholder:text-bone/30"
              disabled
            />
            <button type="button" disabled className="btn btn-disabled">
              Sign in :: COMING SOON
            </button>
          </form>
          <div className="mt-6 text-bone/60 text-sm font-mono" style={{ letterSpacing: "0.1em" }}>
            No account?{" "}
            <Link href="/signup" className="text-cyan hover:text-magenta">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
