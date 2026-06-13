/**
 * Nome: app/api/photos/count/route.ts
 * Função: Retorna apenas a quantidade total de memórias cadastradas.
 */

import { NextResponse } from "next/server"
import { getPhotosCount } from "@/lib/db"

export const runtime = "edge"

export async function GET() {
  try {
    const count = await getPhotosCount()
    return NextResponse.json({ count })
  } catch (error) {
    console.error("[api/photos/count] Erro ao contar fotos:", error)
    return NextResponse.json(
      { error: "Falha ao contar fotos" },
      { status: 500 }
    )
  }
}
