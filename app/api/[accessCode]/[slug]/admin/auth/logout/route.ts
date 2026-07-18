import { NextRequest, NextResponse } from "next/server"
import { clearAdminSession, invalidateSession } from "@/lib/admin-auth"
import { getWeddingByAccessCode } from "@/lib/wedding-context"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode } = await params
  const wedding = await getWeddingByAccessCode(accessCode)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  await invalidateSession(wedding.id)
  const response = NextResponse.json({ success: true })
  return clearAdminSession(response, accessCode)
}
