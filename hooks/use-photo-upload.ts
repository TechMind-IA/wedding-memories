/**
 * Nome: hooks/use-photo-upload.ts
 * Função: Hook para upload de fotos do casamento.
 */

"use client"

import { useState } from "react"
import { extractExifBrowser } from "@/lib/exif-browser"

export function usePhotoUpload(apiBase: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const uploadToS3WithProgress = (url: string, file: File, onProgress: (loaded: number, total: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener("progress", (event) => { if (event.lengthComputable) onProgress(event.loaded, event.total) })
      xhr.addEventListener("load", () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(`Falha ${xhr.status}`)) })
      xhr.addEventListener("error", () => reject(new Error("Erro de rede")))
      xhr.addEventListener("abort", () => reject(new Error("Cancelado")))
      xhr.open("PUT", url)
      xhr.setRequestHeader("Content-Type", file.type)
      xhr.send(file)
    })
  }

  const uploadPhotos = async (files: File[], uploaderName: string, _fileTypes?: string[], dateTakenFallbacks?: Array<string | null>): Promise<void> => {
    setIsLoading(true); setError(null); setProgress(0)
    try {
      const exifResults = await Promise.all(files.map((file) => extractExifBrowser(file)))
      const presignRes = await fetch(`${apiBase}/upload/presign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploaderName: uploaderName.trim(), files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })) }) })
      if (!presignRes.ok) { const data = await presignRes.json().catch(() => ({})); throw new Error(data.error ?? `Erro ${presignRes.status}`) }
      const { presignedFiles } = await presignRes.json()

      const totalBytes = files.reduce((acc, f) => acc + f.size, 0)
      const loadedPerFile = new Array(files.length).fill(0)
      const updateProgress = () => { const totalLoaded = loadedPerFile.reduce((acc, v) => acc + v, 0); setProgress(totalBytes > 0 ? Math.round((totalLoaded / totalBytes) * 100) : 0) }

      await Promise.all(presignedFiles.map(async (pf: { uploadUrl: string }, i: number) => {
        await uploadToS3WithProgress(pf.uploadUrl, files[i], (loaded) => { loadedPerFile[i] = loaded; updateProgress() })
      }))
      setProgress(100)

      const confirmRes = await fetch(`${apiBase}/upload/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploaderName: uploaderName.trim(), photos: presignedFiles.map((pf: { s3Key: string; fileName: string; publicUrl: string; mimeType: string; fileSize: number; isVideo: boolean }, i: number) => ({ s3Key: pf.s3Key, fileName: pf.fileName, publicUrl: pf.publicUrl, mimeType: pf.mimeType, fileSize: pf.fileSize, isVideo: pf.isVideo, date_taken: exifResults[i].date_taken ?? dateTakenFallbacks?.[i] ?? null, latitude: exifResults[i].latitude ?? null, longitude: exifResults[i].longitude ?? null })) }) })
      if (!confirmRes.ok) { const data = await confirmRes.json().catch(() => ({})); throw new Error(data.error ?? `Erro ${confirmRes.status}`) }
    } catch (err) { const message = err instanceof Error ? err.message : "Erro desconhecido"; setError(message); throw err } finally { setIsLoading(false) }
  }

  return { uploadPhotos, isLoading, error, progress }
}
