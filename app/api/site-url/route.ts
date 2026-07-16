import { NextResponse } from "next/server"

export const runtime = "edge"

export async function GET() {
  const url = process.env.SITE_URL || ""
  return NextResponse.json({ url })
}
