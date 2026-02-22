import { NextRequest, NextResponse } from "next/server"
import { deletePhoto } from "@/lib/db"
import { deleteFromS3 } from "@/lib/s3"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { password } = body as { password: string }

    const deletePassword = process.env.DELETE_PASSWORD
    if (!deletePassword) {
      return NextResponse.json({ error: "Exclusão não configurada no servidor" }, { status: 500 })
    }

    if (password !== deletePassword) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    // Deleta do banco e retorna o s3_key para remover do S3
    const deleted = await deletePhoto(id)
    if (!deleted) {
      return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 })
    }

    // Tenta remover do S3 (não falha a requisição se der erro)
    if (deleted.s3_key) {
      try {
        await deleteFromS3(deleted.s3_key)
      } catch (s3Error) {
        console.error("[api/photos/delete] Erro ao remover do S3:", s3Error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api/photos/delete] Erro:", error)
    return NextResponse.json({ error: "Falha ao excluir foto" }, { status: 500 })
  }
}
