import { NextRequest, NextResponse } from "next/server"
import { isSuperAdminAuthenticated } from "@/lib/super-admin-auth"

export async function GET(request: NextRequest) {
  const authenticated = await isSuperAdminAuthenticated(request)
  return NextResponse.json({ authenticated })
}
