"use client"

import { useState } from "react"
import { extractExifBrowser } from "@/lib/exif-browser"

export function usePhotoUpload() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadPhotos = async (
    files: File[],
    uploaderName: string,
    _fileTypes?: string[]
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Passo 1: extrair EXIF de todas as imagens no browser
      const exifResults = await Promise.all(
        files.map((file) => extractExifBrowser(file))
      )

      // Passo 2: pedir presigned URLs para cada arquivo
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploaderName: uploaderName.trim(),
          files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
        }),
      })

      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}))
        throw new Error(data.error ?? `Erro ${presignRes.status} ao gerar URLs`)
      }

      const { presignedFiles } = await presignRes.json()

      // Passo 3: fazer PUT direto no S3 para cada arquivo
      await Promise.all(
        presignedFiles.map(async (pf: { uploadUrl: string }, i: number) => {
          const res = await fetch(pf.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": files[i].type },
            body: files[i],
          })
          if (!res.ok) {
            throw new Error(`Falha ao enviar ${files[i].name} para o S3 (${res.status})`)
          }
        })
      )

      // Passo 4: confirmar com a API para salvar metadados + EXIF no banco
      const confirmRes = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploaderName: uploaderName.trim(),
          photos: presignedFiles.map(
            (
              pf: {
                s3Key: string
                fileName: string
                publicUrl: string
                mimeType: string
                fileSize: number
                isVideo: boolean
              },
              i: number
            ) => ({
              s3Key: pf.s3Key,
              fileName: pf.fileName,
              publicUrl: pf.publicUrl,
              mimeType: pf.mimeType,
              fileSize: pf.fileSize,
              isVideo: pf.isVideo,
              // EXIF extraído no browser
              date_taken: exifResults[i].date_taken ?? null,
              latitude: exifResults[i].latitude ?? null,
              longitude: exifResults[i].longitude ?? null,
            })
          ),
        }),
      })

      if (!confirmRes.ok) {
        const data = await confirmRes.json().catch(() => ({}))
        throw new Error(data.error ?? `Erro ${confirmRes.status} ao confirmar upload`)
      }

      const data = await confirmRes.json()
      console.log("[usePhotoUpload] Upload concluído:", data.photos?.length, "arquivos")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido no upload"
      console.error("[usePhotoUpload] Erro:", message)
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { uploadPhotos, isLoading, error }
}