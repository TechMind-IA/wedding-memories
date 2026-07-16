import { NextResponse } from "next/server"
import { clearAdminSession, invalidateSession } from "@/lib/admin-auth"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode } = await params
  // We don't need weddingId to invalidate - we just clear the cookie
  // But we need it for DB invalidation. We'll clear the cookie only.
  const response = NextResponse.json({ success: true })
  return clearAdminSession(response, accessCode)
}
