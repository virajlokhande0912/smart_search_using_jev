"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Doc = { id: string; filename: string; createdAt: string };

const DRAFT_KEY = "jev-quick-note";

export default function QuickNote() {
  const [note, setNote] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.resolve(window.localStorage.getItem(DRAFT_KEY)).then((draft) => setNote(draft ?? ""));
    fetch("/api/documents")
      .then((response) => response.json())
      .then(setDocs)
      .catch(() => setDocs([]));
  }, []);

  function updateNote(value: string) {
    setNote(value);
    window.localStorage.setItem(DRAFT_KEY, value);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  }

  function clearNote() {
    if (!note || window.confirm("Clear this quick note?")) {
      setNote("");
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }

  return (
    <main className="app-shell note-shell">
      <header className="note-header">
        <div>
          <Link href="/" className="back-link">← Document library</Link>
          <p className="eyebrow">Scratchpad</p>
          <h1>Quick note</h1>
          <p className="lede">A blank space for thoughts, questions, and ideas between documents.</p>
        </div>
        <span className="save-state" aria-live="polite">{saved ? "Saved locally" : note ? "Draft" : "Empty"}</span>
      </header>

      <div className="note-layout">
        <section className="note-editor" aria-label="Quick note editor">
          <textarea
            autoFocus
            value={note}
            onChange={(event) => updateNote(event.target.value)}
            placeholder="Start writing…"
            aria-label="Quick note"
          />
          <div className="note-toolbar">
            <span>{note.length ? `${note.length} characters` : "Your note is saved in this browser"}</span>
            <button className="btn btn-quiet" type="button" onClick={clearNote} disabled={!note}>Clear note</button>
          </div>
        </section>

        <aside className="note-docs" aria-label="Your documents">
          <div className="section-heading"><h2>Documents</h2><Link href="/" className="text-link">View all</Link></div>
          {docs.length ? (
            <nav className="note-doc-list">
              {docs.map((doc) => <Link href={`/document/${doc.id}`} className="note-doc" key={doc.id}><strong>{doc.filename}</strong><time>{new Date(doc.createdAt).toLocaleDateString()}</time></Link>)}
            </nav>
          ) : <p className="muted">Your uploaded documents will appear here.</p>}
          <Link href="/" className="btn btn-secondary note-library-link">Upload a document</Link>
        </aside>
      </div>
    </main>
  );
}
