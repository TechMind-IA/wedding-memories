/**
 * Nome: hooks/use-photos.ts
 * Função: Expõe o hook use photos para encapsular estado e efeitos reutilizáveis.
 */

"use client"

import { useCallback, useEffect, useState } from "react"

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
  date_taken?: string | null
}

const PAGE_SIZE = 24

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const fetchPhotos = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/photos?limit=${PAGE_SIZE}`)
      if (!response.ok) {
        console.error("[usePhotos] Falha ao buscar fotos:", response.status)
        return
      }
      const data = await response.json()
      setPhotos(data.photos || [])
      setHasMore(Boolean(data.hasMore))
      setNextCursor(data.nextCursor ?? null)
    } catch (error) {
      console.error("[usePhotos] Erro:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const response = await fetch(
        `/api/photos?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`
      )
      if (!response.ok) {
        console.error("[usePhotos] Falha ao buscar mais fotos:", response.status)
        return
      }

      const data = await response.json()
      setPhotos((prev) => [...prev, ...(data.photos || [])])
      setHasMore(Boolean(data.hasMore))
      setNextCursor(data.nextCursor ?? null)
    } catch (error) {
      console.error("[usePhotos] Erro ao carregar mais:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, nextCursor])

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  return { photos, isLoading, isLoadingMore, hasMore, loadMore, refetch: fetchPhotos }
}
