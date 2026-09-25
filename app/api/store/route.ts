import { NextResponse } from "next/server"
import { readStore, writeStore, type StoreSnapshot } from "@/lib/backend-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const snapshot = await readStore()
  return NextResponse.json(snapshot)
}

export async function PUT(request: Request) {
  const body = (await request.json()) as StoreSnapshot
  await writeStore(body)
  return NextResponse.json({ ok: true })
}
