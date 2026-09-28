"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type Doc = { id: string; filename: string; summary: string | null; createdAt: string };
type SearchResult = { id: string; filename: string; excerpt: string };
type AnswerSource = { documentId: string; filename: string; chunkIndex: number };

function isQuestion(value: string) {
  const trimmed = value.trim();
  if (trimmed.endsWith("?")) return true;
  return /^(what|how|why|does|is|are|can|could|would|should|when|where|who|which|do)\b/i.test(trimmed);
}

export default function Home() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState("");
  const [answerState, setAnswerState] = useState<"idle" | "waiting" | "streaming" | "done" | "empty" | "error" | "interrupted">("idle");
  const [answerMessage, setAnswerMessage] = useState("");
  const [sources, setSources] = useState<AnswerSource[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const askAbort = useRef<AbortController | null>(null);
  const askTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = () => fetch("/api/documents").then((r) => r.json()).then(setDocs);
  useEffect(() => { load(); }, []);

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setStatus("Parsing → embedding → summarizing → finding links…");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/documents/upload", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setStatus(data.error ?? `Upload failed (${response.status})`);
      else {
        setStatus("Ready");
        setFile(null);
        if (fileInput.current) fileInput.current.value = "";
        load();
      }
    } catch (error) {
      setStatus(error instanceof Error ? `Upload failed: ${error.message}` : "Upload failed. Is the app server running?");
    } finally {
      setUploading(false);
    }
  }

  async function search(value: string) {
    setQuery(value);
    if (askTimer.current) clearTimeout(askTimer.current);
    askAbort.current?.abort();
    setAnswer("");
    setSources([]);
    setAnswerMessage("");
    setSourcesOpen(false);
    if (!value) {
      setAnswerState("idle");
      setResults([]);
      return;
    }
    if (!isQuestion(value)) {
      setAnswerState("idle");
      setResults(await (await fetch(`/api/search?q=${encodeURIComponent(value)}`)).json());
      return;
    }

    setResults([]);
    if (docs.length === 0) {
      setAnswerState("empty");
      setAnswerMessage("Upload a document first to ask a question.");
      return;
    }
    setAnswerState("waiting");
    askTimer.current = setTimeout(async () => {
      const controller = new AbortController();
      askAbort.current = controller;
      try {
        const response = await fetch("/api/search/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: value.trim() }),
          signal: controller.signal,
        });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.includes("text/event-stream")) {
          const data = await response.json().catch(() => ({}));
          setAnswerState(data.kind === "irrelevant" || data.kind === "empty" ? "empty" : "error");
          setAnswerMessage(data.message ?? data.error ?? "Couldn't generate an answer — Ollama may be offline.");
          return;
        }
        if (!response.body) throw new Error("Answer stream was unavailable.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = "";
        let streamedText = "";
        setAnswerState("streaming");
        while (true) {
          const { value: bytes, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(bytes, { stream: true });
          const events = pending.split("\n\n");
          pending = events.pop() ?? "";
          for (const event of events) {
            const eventName = event.match(/^event: (.+)$/m)?.[1];
            const dataLine = event.match(/^data: (.+)$/m)?.[1];
            if (!eventName || !dataLine) continue;
            const data = JSON.parse(dataLine);
            if (eventName === "sources") setSources(data.sources ?? []);
            if (eventName === "token") {
              streamedText += data.text;
              setAnswer((current) => current + data.text);
            }
            if (eventName === "done") setAnswerState((current) => current === "interrupted" ? current : "done");
            if (eventName === "error") {
              setAnswerState(streamedText ? "interrupted" : "error");
              setAnswerMessage(streamedText ? "(response interrupted)" : "Couldn't generate an answer — Ollama may be offline.");
            }
          }
        }
        setAnswerState((current) => current === "interrupted" ? current : "done");
      } catch (error) {
        if (controller.signal.aborted) return;
        setAnswerState("interrupted");
        setAnswerMessage("(response interrupted)");
      }
    }, 500);
  }

  async function removeDocument(id: string, filename: string) {
    if (!window.confirm(`Remove “${filename}” and its related links?`)) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setDocs((current) => current.filter((doc) => doc.id !== id));
      setResults((current) => current.filter((result) => result.id !== id));
    } catch {
      setStatus("Could not remove document. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div className="page-header-top"><div><p className="eyebrow">Structured notes</p><h1>Document library</h1></div><Link href="/note" className="btn btn-secondary">Open quick note</Link></div>
        <p className="lede">Upload documents to build a local, searchable knowledge base. Ollama summarizes content and classifies relationships with structured confidence.</p>
      </header>

      <form onSubmit={upload} className="upload-panel">
        <div>
          <p className="upload-copy">PDF, image, txt, or md · max 10MB</p>
          {status && <p className="status" aria-live="polite">{status}</p>}
        </div>
        <div className="upload-controls">
          <input ref={fileInput} className="file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md" onChange={(event) => setFile(event.target.files?.[0] ?? null)} disabled={uploading} />
          <button className="btn btn-primary" disabled={!file || uploading}>{uploading ? "Uploading…" : "Upload document"}</button>
        </div>
      </form>

      <section className="section" aria-label="Search">
        <div className="search-bar"><span className="search-icon" aria-hidden="true">⌕</span><input value={query} onChange={(event) => search(event.target.value)} placeholder="Search documents or ask a question…" aria-label="Search documents or ask a question" /></div>
        {results.length > 0 && <div className="search-results">{results.map((result) => <Link className="search-result" href={`/document/${result.id}`} key={result.id}><strong>{result.filename}</strong><span> · {result.excerpt}…</span></Link>)}</div>}
        {answerState !== "idle" && <div className="answer-block" aria-live="polite">
          {answerState === "empty" || answerState === "error" ? <p className="answer-empty">{answerMessage}</p> : <>
            {(answer || answerState === "waiting" || answerState === "streaming") && <p className={`answer-text${answerState === "waiting" || answerState === "streaming" ? " streaming" : ""}`}>{answer || "Thinking…"}</p>}
            {answerState === "interrupted" && <p className="answer-empty">{answerMessage || "(response interrupted)"}</p>}
            {sources.length > 0 && <>
              <button type="button" className="sources-toggle" aria-expanded={sourcesOpen} onClick={() => setSourcesOpen((open) => !open)}><span>{sourcesOpen ? "▾" : "▸"}</span> Sources ({sources.length})</button>
              {sourcesOpen && <div className="sources-list">{sources.map((source, index) => <div className="source-item" key={`${source.documentId}-${source.chunkIndex}-${index}`}><Link className="filename" href={`/document/${source.documentId}`}>{source.filename}</Link><span>· chunk {source.chunkIndex + 1}</span></div>)}</div>}
            </>}
          </>}
        </div>}
      </section>

      <section className="section">
        <div className="section-heading"><h2>Documents</h2><span className="count">{docs.length} {docs.length === 1 ? "document" : "documents"}</span></div>
        {docs.length === 0 ? <p className="empty-state">Upload a document to get started.</p> : <div className="card-list">{docs.map((doc) => <div key={doc.id} className="card"><Link href={`/document/${doc.id}`} className="card-link"><div className="card-top"><h3 className="card-title">{doc.filename}</h3><time className="card-meta">{new Date(doc.createdAt).toLocaleDateString()}</time></div><p className="card-summary">{doc.summary}</p></Link><button type="button" className="delete-btn" onClick={() => removeDocument(doc.id, doc.filename)} disabled={deletingId === doc.id}>{deletingId === doc.id ? "Removing…" : "Remove"}</button></div>)}</div>}
      </section>
    </main>
  );
}
