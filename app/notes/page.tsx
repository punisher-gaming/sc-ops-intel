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
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="divider">
            <div className="bar" />
            <div className="label">USER TERMINAL :: NOTES</div>
            <div className="bar" />
          </div>
          <div className="tron-card mt-8">
            <div className="font-mono text-bone" style={{ fontSize: "1.1rem", lineHeight: 1.8, letterSpacing: "0.06em" }}>
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

  if (userLoading || loading) {
    return (
      <PageShell>
        <div className="max-w-[1200px] mx-auto px-8 text-center mt-16">
          <div className="font-mono text-bone/60" style={{ letterSpacing: "0.2em" }}>
            &gt; loading notes...
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-[1000px] mx-auto px-8">
        <div className="divider">
          <div className="bar" />
          <div className="label">USER TERMINAL :: NOTES</div>
          <div className="bar" />
        </div>

        <div className="tron-card mt-8">
          <h2 className="font-display font-bold text-xl mb-4" style={{ letterSpacing: "0.1em" }}>
            {editingId ? "EDIT NOTE" : "NEW NOTE"}
          </h2>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-4 py-3 font-mono text-lg bg-transparent border border-cyan/30 text-bone placeholder:text-bone/30 focus:border-cyan outline-none"
            />
            <textarea
              placeholder="your note..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={5}
              className="px-4 py-3 font-mono bg-transparent border border-cyan/30 text-bone placeholder:text-bone/30 focus:border-cyan outline-none resize-y"
            />
            {error && (
              <div className="font-mono text-sm p-3 border border-[#FF3B30]/50 text-[#FF3B30]" style={{ letterSpacing: "0.08em" }}>
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={busy || !body} className="btn btn-primary disabled:opacity-50">
                {busy ? "..." : editingId ? "Save" : "Add Note"}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="btn btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-10 space-y-4">
          {notes.length === 0 ? (
            <div className="font-mono text-bone/50 text-center py-12" style={{ letterSpacing: "0.1em" }}>
              &gt; no notes yet
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="tron-card">
                {note.title && (
                  <div className="font-display font-bold text-lg mb-2" style={{ letterSpacing: "0.1em" }}>
                    {note.title}
                  </div>
                )}
                <div className="font-mono text-bone whitespace-pre-wrap leading-relaxed" style={{ letterSpacing: "0.03em" }}>
                  {note.body}
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-cyan/15">
                  <div className="font-mono text-bone/40 text-xs" style={{ letterSpacing: "0.15em" }}>
                    {new Date(note.updated_at).toLocaleString()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(note)}
                      className="font-mono text-cyan hover:text-magenta text-sm"
                      style={{ letterSpacing: "0.15em" }}
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="font-mono text-[#FF3B30] hover:text-magenta text-sm"
                      style={{ letterSpacing: "0.15em" }}
                    >
                      DELETE
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
