export function chunkText(text: string, size = 2400, overlap = 300) {
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += size - overlap) {
    const chunk = text.slice(start, start + size).trim();
    if (chunk) chunks.push(chunk);
    if (start + size >= text.length) break;
  }
  return chunks;
}

export function cosine(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return dot / ((Math.sqrt(aa) * Math.sqrt(bb)) || 1);
}
