import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getDataStore().getGameDetail(id);
  if (!detail) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  return NextResponse.json(detail);
}
