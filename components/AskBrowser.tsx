"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ask, type Answer, type Hit } from "@/lib/ask";

// AI assistant page. Two layers:
//   1. Local rules-based matcher (lib/ask.ts) — fast, free, runs in
//      milliseconds. Returns structured Hit groups (ships / blueprints
//      / resources / commodities).
//   2. Real AI synthesis via Cloudflare Workers AI (/ai/chat on the
//      ingest worker) — takes the user question + the rules-based
//      hits as context and writes a natural-language answer.
//
// We always render the rules-based hits (they're free and useful even
// if the AI is unavailable). The AI answer streams in above them when
// it arrives. Conversation history is kept in component state for the
// session and persisted to localStorage so refreshes don't wipe it.

const WORKER_AI_URL = "https://sc-ops-intel-ingest.clint-150.workers.dev/ai/chat";
const HISTORY_KEY = "citizendex:ai:history:v1";

const EXAMPLES = [
  "Where's the best spot to mine Tungsten?",
  "What blueprints use Aluminum?",
  "Compare Polaris vs Idris-M",
  "Buy Agricium",
  "How do I make my first 100k aUEC?",
  "What ships fit a Cutlass cargo bay?",
];

interface ChatTurn {
  id: string;
  question: string;
  answer?: Answer;
  aiText?: string;            // synthesized answer from CF Workers AI
  aiState: "idle" | "thinking" | "ok" | "error";
  aiError?: string;
  sourcedFromWiki?: boolean;  // true when AI grounded answer in SC Wiki
  ts: number;
}

export function AskBrowser() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [input, setInput] = useState(initialQ);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  // Hydrate history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatTurn[];
        if (Array.isArray(parsed)) setTurns(parsed.slice(-10));
      }
    } catch {
      /* ignore corrupted */
    }
  }, []);

  // Persist history (cap at 20 turns to stay polite to localStorage)
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(turns.slice(-20)));
    } catch {
      /* over quota — ignore */
    }
  }, [turns]);

  // Run an initial query if ?q= was set
  useEffect(() => {
    if (initialQ && !turns.some((t) => t.question === initialQ)) {
      runQuery(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  // Auto-scroll to bottom when a new turn lands
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length]);

  async function runQuery(q: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const turn: ChatTurn = {
      id,
      question: q,
      aiState: "thinking",
      ts: Date.now(),
    };
    setTurns((prev) => [...prev, turn]);
    setBusy(true);

    // 1. Rules-based search (always)
    let answer: Answer | undefined;
    try {
      answer = await ask(q);
    } catch {
      /* leave answer undefined */
    }

    // Patch turn with rules result so user sees something while AI thinks
    setTurns((prev) =>
      prev.map((t) => (t.id === id ? { ...t, answer } : t)),
    );

    // 2. AI synthesis call (best-effort; if the worker AI isn't
    //    configured the page still works because we have the hits)
    try {
      const context = answerToContext(answer);
      const history = turns.slice(-3).flatMap((t) => {
        const out: Array<{ role: "user" | "assistant"; content: string }> = [
          { role: "user", content: t.question },
        ];
        if (t.aiText) out.push({ role: "assistant", content: t.aiText });
        return out;
      });
      const res = await fetch(WORKER_AI_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, context, history }),
      });
      const body = (await res.json()) as { ok: boolean; answer?: string; error?: string; sourcedFromWiki?: boolean };
      if (!body.ok || !body.answer) throw new Error(body.error ?? "AI returned no answer");
      setTurns((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, aiText: body.answer, aiState: "ok", sourcedFromWiki: !!body.sourcedFromWiki }
            : t,
        ),
      );
    } catch (e) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, aiState: "error", aiError: (e as Error).message ?? String(e) }
            : t,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput("");
    router.replace(`/ai?q=${encodeURIComponent(q)}`);
    runQuery(q);
  }

  function clearHistory() {
    if (!confirm("Clear all chat history?")) return;
    setTurns([]);
    router.replace("/ai");
  }

  return (
    <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "10rem" }}>
      <div className="page-header">
        <div className="accent-label">CitizenDex AI</div>
        <h1>
          Ask the <span style={{ color: "var(--accent)" }}>AI</span>
        </h1>
        <p>
          Plain-English questions about ships, blueprints, resources,
          commodities, mining, crafting, trading. Powered by our auto-synced
          catalog and Cloudflare Workers AI for natural-language answers.
        </p>
      </div>

      {/* Chat history */}
      {turns.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
          {turns.map((t) => (
            <Turn key={t.id} turn={t} />
          ))}
          <div ref={scrollEndRef} />
        </div>
      )}

      {/* Empty state — show suggested queries */}
      {turns.length === 0 && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
          <div className="accent-label" style={{ marginBottom: 10 }}>Try one of these</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setInput(ex);
                  setTimeout(() => {
                    router.replace(`/ai?q=${encodeURIComponent(ex)}`);
                    runQuery(ex);
                  }, 0);
                }}
                disabled={busy}
                style={{
                  padding: "7px 14px",
                  borderRadius: 18,
                  fontSize: "0.85rem",
                  cursor: busy ? "not-allowed" : "pointer",
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

      {/* Composer — fixed to bottom of viewport for chat feel */}
      <form
        onSubmit={submit}
        style={{
          position: "sticky",
          bottom: 16,
          background: "rgba(5,7,13,0.92)",
          backdropFilter: "blur(10px)",
          padding: "12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          marginTop: 16,
        }}
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about Star Citizen…"
          className="input"
          disabled={busy}
          style={{ flex: 1, height: 44, fontSize: "1rem" }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ height: 44, padding: "0 18px" }}
          disabled={busy || !input.trim()}
        >
          {busy ? "…" : "Ask"}
        </button>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="btn btn-ghost"
            style={{ height: 44, padding: "0 12px", fontSize: "0.78rem" }}
            title="Clear chat history"
          >
            Clear
          </button>
        )}
      </form>
    </div>
  );
}

function Turn({ turn }: { turn: ChatTurn }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* User question — right-aligned bubble */}
      <div style={{ alignSelf: "flex-end", maxWidth: "85%" }}>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(77,217,255,0.12)",
            border: "1px solid rgba(77,217,255,0.28)",
            color: "var(--text)",
            fontSize: "0.95rem",
          }}
        >
          {turn.question}
        </div>
      </div>

      {/* AI answer */}
      <div style={{ alignSelf: "flex-start", maxWidth: "92%" }}>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--text)",
          }}
        >
          <div className="label-mini" style={{ marginBottom: 6, display: "flex", gap: 8, alignItems: "center" }}>
            <span>🤖 CitizenDex AI</span>
            {turn.sourcedFromWiki && (
              <span
                style={{
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: "rgba(77,217,255,0.12)",
                  border: "1px solid rgba(77,217,255,0.3)",
                  color: "var(--accent)",
                  fontSize: "0.62rem",
                  letterSpacing: "0.08em",
                }}
                title="Answer drew from Star Citizen Wiki"
              >
                📚 wiki
              </span>
            )}
          </div>
          {turn.aiState === "thinking" && (
            <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
              Thinking…
            </div>
          )}
          {turn.aiState === "ok" && turn.aiText && (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: "0.95rem" }}>
              {turn.aiText}
            </div>
          )}
          {turn.aiState === "error" && (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              AI synthesis unavailable right now — see the catalog matches
              below for what we found.
            </div>
          )}
        </div>
      </div>

      {/* Structured rules-based hits — always shown when present */}
      {turn.answer && turn.answer.total > 0 && <AnswerSections answer={turn.answer} />}
      {turn.answer && turn.answer.total === 0 && (
        <div
          style={{
            color: "var(--text-dim)",
            fontSize: "0.85rem",
            paddingLeft: 8,
          }}
        >
          (No exact catalog hits.)
        </div>
      )}
    </div>
  );
}

function AnswerSections({ answer }: { answer: Answer }) {
  const order = (() => {
    switch (answer.intent) {
      case "mine":
        return ["resources", "commodities", "blueprints", "ships"] as const;
      case "buy":
      case "sell":
        return ["commodities", "blueprints", "resources", "ships"] as const;
      case "recipe":
      case "uses":
        return ["blueprints", "resources", "ships", "commodities"] as const;
      case "ship":
        return ["ships", "blueprints", "resources", "commodities"] as const;
      default:
        return ["resources", "blueprints", "commodities", "ships"] as const;
    }
  })();
  const titles: Record<string, string> = {
    resources: "Resources",
    blueprints: "Blueprints",
    commodities: "Commodities",
    ships: "Ships",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 8 }}>
      {order.map((key) => {
        const hits = answer[key] as Hit[];
        if (hits.length === 0) return null;
        return <Section key={key} title={titles[key]} hits={hits} />;
      })}
    </div>
  );
}

function Section({ title, hits }: { title: string; hits: Hit[] }) {
  return (
    <div className="card" style={{ padding: "1rem 1.25rem" }}>
      <div className="accent-label" style={{ marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {hits.map((h) => (
          <Link
            key={h.id}
            href={h.href}
            className="card card-hover"
            style={{ padding: "0.7rem 0.95rem", textDecoration: "none", color: "var(--text)", display: "block" }}
          >
            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--accent)" }}>{h.name}</div>
            <div className="label-mini" style={{ marginTop: 2 }}>{h.subtitle}</div>
            {h.detail && (
              <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginTop: 6 }}>{h.detail}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Compact summary of catalog hits passed to the AI as context. We list
// the top entry per category with its key facts; the LLM then has
// concrete data to ground its answer in.
function answerToContext(a: Answer | undefined): string {
  if (!a || a.total === 0) return "";
  const lines: string[] = [];
  for (const key of ["ships", "blueprints", "resources", "commodities"] as const) {
    const hits = a[key];
    if (hits.length === 0) continue;
    lines.push(`${key.toUpperCase()}:`);
    for (const h of hits.slice(0, 3)) {
      const detail = h.detail ? ` — ${h.detail}` : "";
      lines.push(`  • ${h.name} (${h.subtitle})${detail} → ${h.href}`);
    }
  }
  return lines.join("\n");
}
