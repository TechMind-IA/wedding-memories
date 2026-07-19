import { NextRequest, NextResponse } from "next/server"
import { clearAdminSession, invalidateSession } from "@/lib/admin-auth"
import { getWeddingByAccessCodeAndSlug } from "@/lib/wedding-context"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode, slug } = await params
  const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
  if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

  await invalidateSession(wedding.id)
  const response = NextResponse.json({ success: true })
  return clearAdminSession(response, accessCode)
}
