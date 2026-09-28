import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createWorker } from "tesseract.js";
import { db } from "../../../../lib/db";
import { embed, understand } from "../../../../lib/ollama";
import { chunkText } from "../../../../lib/text";
import { linkDocument } from "../../../../lib/links";

const MAX_BYTES = 10 * 1024 * 1024;
const allowed = new Map([["application/pdf", "pdf"], ["text/plain", "txt"], ["text/markdown", "md"], ["image/png", "image"], ["image/jpeg", "image"], ["image/webp", "image"]]);

// Next.js bundles pdf.js server code, so its default relative worker path points at a
// non-existent .next chunk. Point PDF.js at pdf-parse's standalone Node worker instead.
PDFParse.setWorker(pathToFileURL(path.join(process.cwd(), "node_modules/pdf-parse/dist/worker/pdf.worker.mjs")).href);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "file exceeds 10MB limit" }, { status: 413 });
    const extension = file.name.split(".").pop()?.toLowerCase();
    const fileType = allowed.get(file.type) ?? (["txt", "md"].includes(extension ?? "") ? extension : undefined);
    if (!fileType) return NextResponse.json({ error: "only PDF, image, txt, and md files are supported" }, { status: 415 });
    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText = "";
    if (fileType === "pdf") {
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      if (parsed.total > 20) return NextResponse.json({ error: "PDFs are limited to 20 pages" }, { status: 413 });
      rawText = parsed.text;
    } else if (fileType === "image") {
      const worker = await createWorker("eng");
      rawText = (await worker.recognize(buffer)).data.text;
      await worker.terminate();
    } else rawText = buffer.toString("utf8");
    if (!rawText.trim()) return NextResponse.json({ error: "could not extract text from document" }, { status: 422 });
    if (rawText.length > 200_000) return NextResponse.json({ error: "extracted text is too large for the demo" }, { status: 413 });
    const chunks = chunkText(rawText);
    const embeddings = await Promise.all(chunks.map(embed));
    const understanding = await understand(rawText);
    const document = await db.document.create({ data: { filename: file.name, fileType, rawText, summary: understanding.summary, entities: JSON.stringify(understanding.entities), chunks: { create: chunks.map((content, chunkIndex) => ({ content, chunkIndex, embedding: JSON.stringify(embeddings[chunkIndex]) })) } }, select: { id: true, filename: true, summary: true } });
    await linkDocument(document.id);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Upload failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Upload could not be processed" }, { status: 500 });
  }
}
