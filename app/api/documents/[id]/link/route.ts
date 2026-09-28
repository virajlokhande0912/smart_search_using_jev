import { NextResponse } from "next/server";
import { linkDocument } from "../../../../../lib/links";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; await linkDocument(id); return NextResponse.json({ ok: true }); }
