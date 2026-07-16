import { NextResponse } from "next/server"
import { clearSuperAdminSession, invalidateSuperAdminSession } from "@/lib/super-admin-auth"

export async function POST() {
  await invalidateSuperAdminSession()
  const response = NextResponse.json({ success: true })
  return clearSuperAdminSession(response)
}
