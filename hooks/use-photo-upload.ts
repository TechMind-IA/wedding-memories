"use client"

import { useState } from "react"

export function usePhotoUpload() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadPhotos = async (
    files: File[],
    uploaderName: string,
    fileTypes?: string[]
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("uploaderName", uploaderName.trim())

      files.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? `Erro ${response.status}: falha no upload`)
      }

      const data = await response.json()
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