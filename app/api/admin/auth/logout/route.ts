/**
 * Nome: app/api/admin/auth/logout/route.ts
 * Função: Logout server-side — remove cookie httpOnly e invalida token.
 */

import { NextResponse } from "next/server"
import { clearAdminSession, invalidateSession } from "@/lib/admin-auth"

export async function POST() {
  await invalidateSession()
  const response = NextResponse.json({ success: true })
  return clearAdminSession(response)
}
