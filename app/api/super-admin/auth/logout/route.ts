import { NextRequest, NextResponse } from "next/server"
import { clearSuperAdminSession, invalidateSuperAdminSession } from "@/lib/super-admin-auth"

const SUPER_ADMIN_COOKIE = "super_admin_session"

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(SUPER_ADMIN_COOKIE)
  const token = cookie?.value
  await invalidateSuperAdminSession(token)
  const response = NextResponse.json({ success: true })
  return clearSuperAdminSession(response)
}
