import { PageShell } from "@/components/PageShell";

export default function AccountPage() {
  return (
    <PageShell>
      <div className="max-w-[900px] mx-auto px-8">
        <div className="divider">
          <div className="bar" />
          <div className="label">ACCOUNT</div>
          <div className="bar" />
        </div>

        <div className="tron-card mt-8">
          <h2
            className="font-display font-bold text-2xl mb-4"
            style={{ letterSpacing: "0.1em" }}
          >
            PROFILE
          </h2>
          <p className="text-bone/70 mb-6">Display name, avatar, and preferences. Full editor landing in Phase 2.</p>
        </div>

        <div className="tron-card mt-8">
          <h2
            className="font-display font-bold text-2xl mb-4"
            style={{ letterSpacing: "0.1em" }}
          >
            RSI HANDLE
          </h2>
          <p className="text-bone/70 mb-4">
            Optional. If you link your RSI handle, we&apos;ll fetch and display your{" "}
            <strong>public</strong> RSI profile — orgs, badges, join date. This is a one-way public
            lookup; we never request your RSI password.
          </p>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="your_rsi_handle"
              disabled
              className="flex-1 px-4 py-2 font-mono text-lg bg-transparent border border-cyan/30 text-bone placeholder:text-bone/30"
              style={{ letterSpacing: "0.1em" }}
            />
            <button disabled className="btn btn-disabled">Link (soon)</button>
          </div>
        </div>

        <div className="tron-card mt-8">
          <h2
            className="font-display font-bold text-2xl mb-2"
            style={{ letterSpacing: "0.1em" }}
          >
            HANGAR
          </h2>
          <p className="text-bone/70 mb-4">
            Import your purchased-ship list from your RSI pledges page. A guided flow lets you
            paste the page HTML and we parse the fleet locally — no credentials leave your
            browser.
          </p>
          <button disabled className="btn btn-disabled">
            Import Hangar :: COMING SOON
          </button>
        </div>
      </div>
    </PageShell>
  );
}
