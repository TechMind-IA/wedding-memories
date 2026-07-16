import { NextRequest, NextResponse } from "next/server"
import { isSuperAdminAuthenticated } from "@/lib/super-admin-auth"
import { getAllWeddings, createWedding } from "@/lib/db"
import { randomBytes } from "crypto"

export async function GET(request: NextRequest) {
  if (!(await isSuperAdminAuthenticated(request))) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  try {
    const weddings = await getAllWeddings()
    return NextResponse.json({ weddings })
  } catch (error) {
    console.error("[api/super-admin/weddings] Erro:", error)
    return NextResponse.json({ error: "Falha ao buscar casamentos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await isSuperAdminAuthenticated(request))) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { slug, coupleNames, weddingDate, themeColor } = body as {
      slug: string; coupleNames: string; weddingDate?: string; themeColor?: string
    }
    if (!slug || !coupleNames) return NextResponse.json({ error: "slug e coupleNames obrigatórios" }, { status: 400 })
    if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "slug deve conter apenas letras minúsculas, números e hífens" }, { status: 400 })

    const accessCode = randomBytes(6).toString("hex")
    const result = await createWedding({ accessCode, slug, coupleNames, weddingDate, themeColor })

    return NextResponse.json({ wedding: { id: result.id, accessCode, slug } }, { status: 201 })
  } catch (error: unknown) {
    console.error("[api/super-admin/weddings] Erro:", error)
    const message = error instanceof Error ? error.message : "Falha ao criar casamento"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
