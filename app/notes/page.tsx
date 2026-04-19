"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { useUser } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";

type Note = {
  id: number;
  user_id: string;
  entity_type: string;
  entity_id: string | null;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export default function NotesPage() {
  const { user, loading: userLoading } = useUser();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (data) setNotes(data as Note[]);
        setLoading(false);
      });
  }, [user, userLoading]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();

    if (editingId) {
      const { data, error } = await supabase
        .from("notes")
        .update({ title: title || null, body })
        .eq("id", editingId)
        .select()
        .single();
      if (error) setError(error.message);
      else if (data) setNotes(notes.map((n) => (n.id === editingId ? (data as Note) : n)));
    } else {
      const { data, error } = await supabase
        .from("notes")
        .insert({ user_id: user.id, title: title || null, body })
        .select()
        .single();
      if (error) setError(error.message);
      else if (data) setNotes([data as Note, ...notes]);
    }

    setTitle("");
    setBody("");
    setEditingId(null);
    setBusy(false);
  }

  function startEdit(note: Note) {
    setTitle(note.title ?? "");
    setBody(note.body);
    setEditingId(note.id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setTitle("");
    setBody("");
    setEditingId(null);
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this note?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) setError(error.message);
    else setNotes(notes.filter((n) => n.id !== id));
  }

  // Unauthenticated state
  if (!userLoading && !user) {
    return (
      <PageShell>
        <div className="container" style={{ paddingTop: "3rem" }}>
          <div className="page-header">
            <div className="accent-label">Account</div>
            <h1>Notes</h1>
            <p>
              Notes are private. Sign in to save loadouts, mission strategies,
              and reminders tied to any ship, weapon, or blueprint.
            </p>
          </div>
          <div className="card" style={{ padding: "2rem", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/login" className="btn btn-primary">Sign in</Link>
            <Link href="/signup" className="btn btn-secondary">Create account</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (userLoading || loading) {
    return (
      <PageShell>
        <div className="container" style={{ paddingTop: "4rem", color: "var(--text-muted)" }}>
          Loading notes…
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container" style={{ paddingTop: "2.5rem" }}>
        <div className="page-header">
          <div className="accent-label">Account</div>
          <h1>Notes</h1>
          <p>
            These are <strong>your private notes</strong> — only you can see them.
            No moderator, no other player, not even other admins. Use them for
            loadouts, mission strategies, crafting plans, or anything else
            you&apos;d jot in a personal logbook.
          </p>
        </div>

        <div className="card" style={{ padding: "1.75rem", marginTop: "1rem" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 14 }}>
            {editingId ? "Edit note" : "New note"}
          </div>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="text"
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
            <textarea
              placeholder="Write your note…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={5}
              className="textarea"
            />
            {error && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 6,
                  background: "rgba(255,107,107,0.08)",
                  border: "1px solid rgba(255,107,107,0.3)",
                  color: "var(--alert)",
                  fontSize: "0.85rem",
                }}
              >
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={busy || !body} className="btn btn-primary" style={{ opacity: busy || !body ? 0.5 : 1 }}>
                {busy ? "Saving…" : editingId ? "Save" : "Add note"}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="btn btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          {notes.length === 0 ? (
            <div style={{ padding: "3rem 0", textAlign: "center", color: "var(--text-dim)" }}>
              No notes yet.
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="card" style={{ padding: "1.25rem 1.5rem" }}>
                {note.title && (
                  <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 6 }}>
                    {note.title}
                  </div>
                )}
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    color: "var(--text)",
                    fontSize: "0.9rem",
                    lineHeight: 1.6,
                  }}
                >
                  {note.body}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 14,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="label-mini">
                    {new Date(note.updated_at).toLocaleString()}
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <button onClick={() => startEdit(note)} className="btn btn-ghost" style={{ height: 28, padding: "0 10px", fontSize: "0.8rem" }}>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="btn btn-ghost"
                      style={{ height: 28, padding: "0 10px", fontSize: "0.8rem", color: "var(--alert)" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
