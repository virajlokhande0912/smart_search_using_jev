import { db } from "./db";
import { classifyRelationship } from "./ollama-relationship";
import { cosine } from "./text";

export async function linkDocument(documentId: string) {
  const current = await db.document.findUnique({ where: { id: documentId }, include: { chunks: true } });
  if (!current) return;
  const others = await db.document.findMany({ where: { id: { not: documentId } }, include: { chunks: true } });
  const currentVector = average(current.chunks.map((chunk) => JSON.parse(chunk.embedding) as number[]));
  const candidates = others.map((doc) => ({ doc, similarity: cosine(currentVector, average(doc.chunks.map((chunk) => JSON.parse(chunk.embedding) as number[]))) }))
    .sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  for (const candidate of candidates) {
    if (candidate.similarity < 0.25) continue;
    let result: { relationType: string; relationConfidence: number | null; strength: number; strengthConfidence: number | null; source: string };
    try {
      result = await classifyRelationship(
        current.summary ?? current.rawText.slice(0, 5000),
        candidate.doc.summary ?? candidate.doc.rawText.slice(0, 5000),
      );
    } catch (error) {
      console.warn("Ollama relationship classification failed; using similarity heuristic", error instanceof Error ? error.message : "unknown error");
      if (candidate.similarity < 0.75) continue;
      result = { relationType: "related", relationConfidence: null, strength: Math.max(1, Math.min(5, Math.round(candidate.similarity * 5))), strengthConfidence: null, source: "heuristic" };
    }
    await db.link.upsert({ where: { fromDocumentId_toDocumentId: { fromDocumentId: documentId, toDocumentId: candidate.doc.id } }, create: { fromDocumentId: documentId, toDocumentId: candidate.doc.id, ...result }, update: result });
  }
}

function average(vectors: number[][]) { if (!vectors.length) return [0]; const out = Array.from({ length: vectors[0].length }, () => 0); for (const vector of vectors) vector.forEach((n, i) => out[i] += n / vectors.length); return out; }
