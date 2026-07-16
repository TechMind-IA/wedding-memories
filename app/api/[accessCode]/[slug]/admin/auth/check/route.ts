import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { isAdminAuthenticated } from "@/lib/admin-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode } = await params
  const wedding = await getWeddingByAccessCode(accessCode)
  if (!wedding) return NextResponse.json({ authenticated: false })

  const authenticated = await isAdminAuthenticated(request, accessCode, wedding.id)
  return NextResponse.json({ authenticated })
}
