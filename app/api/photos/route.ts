/**
 * Nome: app/api/photos/route.ts
 * Função: Implementa a rota de API photos do backend Next.js.
 */

import { NextResponse } from "next/server"
import { getPhotosPage } from "@/lib/db"

export const runtime = "edge"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit") ?? 40)
    const cursor = searchParams.get("cursor")
    const result = await getPhotosPage(limit, cursor)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[api/photos] Erro ao buscar fotos:", error)
    return NextResponse.json(
      { error: "Falha ao buscar fotos" },
      { status: 500 }
    )
  }
}
