import { NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { getAllMediaCount } from "@/lib/db"

export const runtime = "edge"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  try {
    const { accessCode } = await params
    const wedding = await getWeddingByAccessCode(accessCode)
    if (!wedding) {
      return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })
    }
    const count = await getAllMediaCount(wedding.id)
    return NextResponse.json({ count })
  } catch (error) {
    console.error("[api/photos/count] Erro:", error)
    return NextResponse.json({ error: "Falha ao contar fotos" }, { status: 500 })
  }
}
