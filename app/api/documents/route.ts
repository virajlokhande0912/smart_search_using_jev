import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
export async function GET() { return NextResponse.json(await db.document.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, filename: true, fileType: true, summary: true, createdAt: true } })); }
