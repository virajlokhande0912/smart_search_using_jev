/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [doc, setDoc] = useState<any>(null);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { params.then(({ id }) => fetch(`/api/documents/${id}`).then((response) => response.json()).then(setDoc)); }, [params]);
  if (!doc) return <main className="app-shell"><p className="muted">Loading…</p></main>;

  async function removeDocument() {
    if (!window.confirm(`Remove “${doc.filename}” and its related links?`)) return;
    setDeleting(true);
    const response = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (response.ok) router.push("/");
    else setDeleting(false);
  }

  const entities = JSON.parse(doc.entities || "[]");
  const links = [
    ...doc.linksFrom.map((link: any) => ({ ...link, sourceDoc: doc, targetDoc: link.toDocument })),
    ...doc.linksTo.map((link: any) => ({ ...link, sourceDoc: link.fromDocument, targetDoc: doc })),
  ];

  return (
    <main className="app-shell">
      <div className="detail-nav"><Link href="/" className="back-link">← Document library</Link><Link href="/note" className="text-link">Open quick note</Link></div>
      <header className="detail-title"><div><p className="eyebrow">Document</p><h1>{doc.filename}</h1></div><button type="button" className="delete-btn" onClick={removeDocument} disabled={deleting}>{deleting ? "Removing…" : "Remove document"}</button></header>

      <section className="summary-block">
        <h2>Summary</h2>
        <p className="summary-text">{doc.summary}</p>
      </section>

      <section className="content-block">
        <h2>Entities</h2>
        <div className="tag-list">{entities.length ? entities.map((entity: string) => <span className="tag" key={entity}>{entity}</span>) : <span className="muted">None extracted</span>}</div>
      </section>

      <section className="content-block">
        <h2>Related documents</h2>
        {links.length ? <div className="link-list">{links.map((link: any) => <div className="link-row" key={link.id}>
          <Link href={`/document/${link.sourceDoc.id}`} className="link-doc">{link.sourceDoc.filename}</Link>
          <span className="link-arrow" aria-hidden="true">→</span>
          <span className="relation-label">{link.relationType}</span>
          <Link href={`/document/${link.targetDoc.id}`} className="link-doc">{link.targetDoc.filename}</Link>
          <span className="link-meta"><span className="strength">strength {link.strength}/5</span>{link.source === "heuristic" ? <span className="confidence estimated">estimated</span> : <span className="confidence">{Math.round((link.relationConfidence ?? 0) * 100)}%</span>}</span>
        </div>)}</div> : <p className="muted">No related documents found.</p>}
      </section>
    </main>
  );
}
