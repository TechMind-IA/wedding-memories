/**
 * Nome: app/api/admin/auth/check/route.ts
 * Função: Verifica se o admin está autenticado.
 */

import { NextRequest, NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const authenticated = await isAdminAuthenticated(request)
  return NextResponse.json({ authenticated })
}
