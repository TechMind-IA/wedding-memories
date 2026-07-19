import { NextResponse } from "next/server"
import { getWeddingByAccessCodeAndSlug } from "@/lib/wedding-context"

export const runtime = "edge"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  try {
    const { accessCode, slug } = await params
    const wedding = await getWeddingByAccessCodeAndSlug(accessCode, slug)
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
