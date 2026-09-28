import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
export async function GET(request: Request) { const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase(); if (!query) return NextResponse.json([]); const chunks = await db.chunk.findMany({ include: { document: { select: { id: true, filename: true } } } }); return NextResponse.json(chunks.filter((c) => c.content.toLowerCase().includes(query)).slice(0, 20).map((c) => ({ id: c.document.id, filename: c.document.filename, excerpt: c.content.slice(0, 180) }))); }
