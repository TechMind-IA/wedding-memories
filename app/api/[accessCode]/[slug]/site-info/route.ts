import { NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"

export const runtime = "edge"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  try {
    const { accessCode } = await params
    const wedding = await getWeddingByAccessCode(accessCode)
    if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

    return NextResponse.json({
      coupleNames: wedding.coupleNames,
      weddingDate: wedding.weddingDate || "",
      themeColor: wedding.themeColor,
    })
  } catch (error) {
    console.error("[api/site-info] Erro:", error)
    return NextResponse.json({ coupleNames: "", weddingDate: "", themeColor: "#C2754F" })
  }
}
