"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// Lightweight emoji picker — toggles a small popover next to the trigger
// button. Click any emoji to insert at the current cursor position in the
// linked textarea (or append if the ref isn't focused).
//
// We keep our own curated set instead of pulling in a 100kb emoji library
// like emoji-mart; the catalog below covers what people actually reach for
// in chat (smileys, reactions, gaming, SC-themed). Easy to extend.

const GROUPS: Array<{ label: string; emojis: string[] }> = [
  {
    label: "Smileys",
    emojis: [
      "😀", "😄", "😁", "😅", "😂", "🤣", "😊", "😉", "😍", "🥰",
      "😘", "😎", "🤓", "🤔", "😏", "😐", "😑", "😶", "🙄", "😴",
      "🤤", "😪", "😵", "🤯", "🥳", "😤", "😡", "🤬", "😱", "🥺",
      "😢", "😭", "🤧", "🤮", "🤢", "😷", "🤒", "🤕", "🤑", "🤠",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉",
      "👆", "👇", "☝️", "👋", "🤚", "🖐", "✋", "🖖", "👏", "🙌",
      "🤝", "🙏", "💪", "🫡", "🫶", "👀", "🧠",
    ],
  },
  {
    label: "Hearts & sparkles",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️",
      "💕", "💖", "💘", "💝", "💞", "💓", "✨", "⭐", "🌟", "💫",
      "🔥", "💥", "💯", "💢", "💦", "💨", "🎉", "🎊", "🏆", "🥇",
    ],
  },
  {
    label: "Star Citizen vibes",
    emojis: [
      "🚀", "🛸", "🛰", "🌌", "🌠", "☄️", "🪐", "🌑", "🌎", "🌏",
      "⚔️", "🛡", "💣", "🎯", "🎮", "🕹", "🔫", "💀", "☠️", "👽",
      "🤖", "⚙️", "🛠", "🔧", "🔩", "📡", "🔭", "💎", "💰", "📦",
    ],
  },
  {
    label: "Reactions",
    emojis: [
      "✅", "❌", "⚠️", "❓", "❗", "‼️", "⁉️", "🆗", "🆒", "🆕",
      "🆙", "💤", "👻", "🎃", "🤡", "👀", "🫥", "🫠", "🫨", "🫣",
    ],
  },
];

export function EmojiPicker({
  textareaRef,
  onInsert,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onInsert?: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function insert(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const next = ta.value.slice(0, start) + emoji + ta.value.slice(end);
    onInsert?.(next);
    // Restore focus + position cursor after the inserted emoji on next tick
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Insert emoji"
        title="Insert emoji"
        style={{
          height: 32,
          width: 36,
          padding: 0,
          borderRadius: 6,
          background: open ? "rgba(77,217,255,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? "rgba(77,217,255,0.4)" : "rgba(255,255,255,0.12)"}`,
          color: "var(--text-muted)",
          fontSize: "1.05rem",
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        😀
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Emoji picker"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            zIndex: 60,
            width: 320,
            maxHeight: 360,
            overflowY: "auto",
            padding: 10,
            background: "#0a0e16",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          }}
        >
          {GROUPS.map((g) => (
            <div key={g.label} style={{ marginBottom: 10 }}>
              <div
                className="label-mini"
                style={{ marginBottom: 6, color: "var(--text-dim)" }}
              >
                {g.label}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(10, 1fr)",
                  gap: 2,
                }}
              >
                {g.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => insert(e)}
                    title={e}
                    style={{
                      height: 28,
                      padding: 0,
                      borderRadius: 4,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "1.05rem",
                      lineHeight: 1,
                      color: "inherit",
                    }}
                    onMouseEnter={(ev) =>
                      ((ev.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.06)")
                    }
                    onMouseLeave={(ev) =>
                      ((ev.currentTarget as HTMLButtonElement).style.background =
                        "transparent")
                    }
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
