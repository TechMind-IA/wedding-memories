"use client"

import { useState } from "react"
import { extractExifBrowser } from "@/lib/exif-browser"

export function usePhotoUpload() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0) // 0 a 100

  /**
   * Faz o PUT de um arquivo diretamente no S3 usando XHR
   * para conseguir acompanhar o progresso de upload.
   */
  const uploadToS3WithProgress = (
    url: string,
    file: File,
    onProgress: (loaded: number, total: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total)
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Falha ao enviar ${file.name} para o S3 (${xhr.status})`))
        }
      })

      xhr.addEventListener("error", () => {
        reject(new Error(`Erro de rede ao enviar ${file.name}`))
      })

      xhr.addEventListener("abort", () => {
        reject(new Error(`Upload de ${file.name} cancelado`))
      })

      xhr.open("PUT", url)
      xhr.setRequestHeader("Content-Type", file.type)
      xhr.send(file)
    })
  }

  const uploadPhotos = async (
    files: File[],
    uploaderName: string,
    _fileTypes?: string[]
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setProgress(0)

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

      // Passo 3: fazer PUT direto no S3 com rastreamento de progresso
      // Mantém bytes carregados por arquivo para calcular o progresso total
      const totalBytes = files.reduce((acc, f) => acc + f.size, 0)
      const loadedPerFile = new Array(files.length).fill(0)

      const updateOverallProgress = () => {
        const totalLoaded = loadedPerFile.reduce((acc, v) => acc + v, 0)
        const pct = totalBytes > 0 ? Math.round((totalLoaded / totalBytes) * 100) : 0
        setProgress(pct)
      }

      await Promise.all(
        presignedFiles.map(async (pf: { uploadUrl: string }, i: number) => {
          await uploadToS3WithProgress(pf.uploadUrl, files[i], (loaded) => {
            loadedPerFile[i] = loaded
            updateOverallProgress()
          })
        })
      )

      setProgress(100)

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { uploadPhotos, isLoading, error, progress }
}
