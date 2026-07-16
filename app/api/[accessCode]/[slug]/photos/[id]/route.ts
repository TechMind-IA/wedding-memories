import { NextRequest, NextResponse } from "next/server"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { deletePhoto, getConfig } from "@/lib/db"
import { deleteFromS3 } from "@/lib/s3"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string; id: string }> }
) {
  try {
    const { accessCode, id } = await params
    const wedding = await getWeddingByAccessCode(accessCode)
    if (!wedding) return NextResponse.json({ error: "Casamento não encontrado" }, { status: 404 })

    const body = await request.json()
    const { password } = body as { password: string }

    const deletePassword = await getConfig(wedding.id, "moderation_password")
    if (!deletePassword) return NextResponse.json({ error: "Exclusão não configurada" }, { status: 500 })
    if (password !== deletePassword) return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })

    const deleted = await deletePhoto(wedding.id, id)
    if (!deleted) return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 })

    if (deleted.s3_key) {
      try { await deleteFromS3(deleted.s3_key) } catch (e) { console.error("[delete] Erro S3:", e) }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/photos/delete] Erro:", error)
    return NextResponse.json({ error: "Falha ao excluir" }, { status: 500 })
  }
}
