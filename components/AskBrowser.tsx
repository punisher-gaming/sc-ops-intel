"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ask, type Answer, type Hit } from "@/lib/ask";

const EXAMPLES = [
  "Where's the best spot to mine Tungsten?",
  "Buy Agricium",
  "Sell Laranite",
  "Sniper rifle",
  "Polaris",
  "How to craft FS-9 LMG",
];

export function AskBrowser() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q) {
      setAnswer(null);
      return;
    }
    setBusy(true);
    ask(q)
      .then((a) => setAnswer(a))
      .finally(() => setBusy(false));
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    router.push(`/ask?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="container" style={{ paddingTop: "2.5rem" }}>
      <div className="page-header">
        <div className="accent-label">Quick answers</div>
        <h1>Ask</h1>
        <p>
          Ask in plain English. We&apos;ll find ships, blueprints, resources,
          and commodities that match — then deep-link you to the details.
        </p>
      </div>

      <form onSubmit={submit} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Where's the best spot to mine Tungsten?"
          className="input"
          style={{ flex: 1, height: 48, fontSize: "1rem" }}
        />
        <button type="submit" className="btn btn-primary" style={{ height: 48 }}>
          Ask
        </button>
      </form>

      {!q && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <div className="accent-label" style={{ marginBottom: 10 }}>Try one of these</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => router.push(`/ask?q=${encodeURIComponent(ex)}`)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 18,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-muted)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {busy && <div style={{ color: "var(--text-dim)", padding: "1rem 0" }}>Searching…</div>}

      {answer && !busy && <AnswerView answer={answer} />}
    </div>
  );
}

function AnswerView({ answer }: { answer: Answer }) {
  if (answer.total === 0) {
    // Quiet fallback — don't shout, just say nothing matched and link to search
    return (
      <div style={{ color: "var(--text-dim)", padding: "1.5rem 0", fontSize: "0.95rem" }}>
        Nothing matched. Try{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
          style={{ color: "var(--accent)" }}
        >
          ⌘K global search
        </a>
        {" "}for partial matches across the whole catalog.
      </div>
    );
  }

  // Order sections by intent — most-relevant kind first
  const order = (() => {
    switch (answer.intent) {
      case "mine":
        return ["resources", "commodities", "blueprints", "ships"] as const;
      case "buy":
      case "sell":
        return ["commodities", "blueprints", "resources", "ships"] as const;
      case "recipe":
        return ["blueprints", "resources", "ships", "commodities"] as const;
      case "ship":
        return ["ships", "blueprints", "resources", "commodities"] as const;
      default:
        return ["resources", "blueprints", "commodities", "ships"] as const;
    }
  })();

  const sectionTitles: Record<string, string> = {
    resources: "Resources",
    blueprints: "Blueprints",
    commodities: "Commodities",
    ships: "Ships",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {order.map((key) => {
        const hits = answer[key] as Hit[];
        if (hits.length === 0) return null;
        return (
          <Section key={key} title={`${sectionTitles[key]} matching "${answer.query}"`} hits={hits} />
        );
      })}
    </div>
  );
}

function Section({ title, hits }: { title: string; hits: Hit[] }) {
  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div className="accent-label" style={{ marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {hits.map((h) => (
          <Link
            key={h.id}
            href={h.href}
            className="card card-hover"
            style={{ padding: "1rem 1.25rem", textDecoration: "none", color: "var(--text)", display: "block" }}
          >
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--accent)" }}>{h.name}</div>
            <div className="label-mini" style={{ marginTop: 4 }}>{h.subtitle}</div>
            {h.detail && (
              <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 8 }}>{h.detail}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
