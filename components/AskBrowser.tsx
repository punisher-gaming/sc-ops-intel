"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ask, type Answer } from "@/lib/ask";

const EXAMPLES = [
  "Where's the best spot to mine Tungsten?",
  "Find a sniper rifle",
  "Buy Agricium",
  "Mine Gold",
  "Polaris",
  "Recipe for FS-9 LMG",
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
          Type a question in plain English. We match it against ships,
          blueprints, resources, and commodities — no AI, just fast lookups
          against the database.
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
  if (answer.kind === "none") {
    return (
      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 6 }}>
          Nothing matched &ldquo;{answer.query}&rdquo;
        </div>
        <div style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Try a more specific term — &ldquo;Mine Gold&rdquo;, &ldquo;Polaris&rdquo;, or
          &ldquo;Buy Laranite&rdquo;. Or use the{" "}
          <Link href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true })); }} style={{ color: "var(--accent)" }}>
            ⌘K global search
          </Link>
          {" "}for partial matches across everything.
        </div>
      </div>
    );
  }

  if (answer.kind === "resource") {
    return (
      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="accent-label" style={{ marginBottom: 10 }}>
          Resources matching &ldquo;{answer.query}&rdquo;
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {answer.hits.map((h) => (
            <Link
              key={h.id}
              href={h.href}
              className="card card-hover"
              style={{ padding: "1rem 1.25rem", textDecoration: "none", color: "var(--text)", display: "block" }}
            >
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--accent)" }}>{h.name}</div>
              <div className="label-mini" style={{ marginTop: 4 }}>{h.subtitle}</div>
              <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 8 }}>{h.detail}</div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (answer.kind === "blueprint") {
    return <HitList title={`Blueprints matching "${answer.query}"`} hits={answer.hits} />;
  }

  if (answer.kind === "commodity") {
    return (
      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="accent-label" style={{ marginBottom: 10 }}>
          Commodities matching &ldquo;{answer.query}&rdquo;
        </div>
        <div className="label-mini" style={{ marginBottom: 12 }}>
          Click through → community-reported buy/sell prices per terminal are listed there
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {answer.hits.map((h) => (
            <Link
              key={h.id}
              href={h.href}
              className="card card-hover"
              style={{ padding: "1rem 1.25rem", textDecoration: "none", color: "var(--text)", display: "block" }}
            >
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--accent)" }}>{h.name}</div>
              <div className="label-mini" style={{ marginTop: 4 }}>{h.subtitle}</div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (answer.kind === "ship") {
    return <HitList title={`Ships matching "${answer.query}"`} hits={answer.hits} />;
  }

  return null;
}

function HitList({
  title,
  hits,
}: {
  title: string;
  hits: Array<{ id: string; name: string; subtitle: string; href: string }>;
}) {
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
          </Link>
        ))}
      </div>
    </div>
  );
}
