"use client"

import { useEffect, useState } from "react"

export interface Photo {
  id: string
  created_at: string
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  storage_url: string
  uploader_name?: string
  is_video?: boolean
}

// Intervalo de atualização: 10 segundos
const POLLING_INTERVAL = 10_000

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPhotos = async () => {
    try {
      const response = await fetch("/api/photos")
      if (!response.ok) {
        console.error("[usePhotos] Falha ao buscar fotos:", response.status)
        return
      }
      const data = await response.json()
      setPhotos(data.photos || [])
    } catch (error) {
      console.error("[usePhotos] Erro:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Busca inicial
    fetchPhotos()

    // Polling: busca de novo a cada 10 segundos
    const interval = setInterval(fetchPhotos, POLLING_INTERVAL)

    // Limpa o intervalo quando o componente desmonta
    return () => clearInterval(interval)
  }, [])

  return { photos, isLoading }
}