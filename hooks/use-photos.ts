/**
 * Nome: hooks/use-photos.ts
 * Função: Hook para buscar fotos do casamento.
 */

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface Photo {
  id: string; created_at: string; file_path: string; file_name: string
  file_size: number; mime_type: string; storage_url: string
  uploader_name?: string; is_video?: boolean; date_taken?: string | null
}

const PAGE_SIZE = 80

interface PhotosPageResponse {
  photos?: Photo[]; hasMore?: boolean; nextCursor?: string | null
}

export function usePhotos(apiBase: string) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const preloadRunRef = useRef(0)

  const fetchRemainingPhotos = useCallback(async (cursor: string, runId: number) => {
    let currentCursor: string | null = cursor
    while (currentCursor && preloadRunRef.current === runId) {
      try {
        const response = await fetch(`${apiBase}/photos?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(currentCursor)}`)
        if (!response.ok) return
        const data = (await response.json()) as PhotosPageResponse
        if (preloadRunRef.current !== runId) return
        setPhotos((prev) => { const seen = new Set(prev.map((p) => p.id)); const incoming = (data.photos || []).filter((p) => !seen.has(p.id)); return [...prev, ...incoming] })
        setHasMore(Boolean(data.hasMore)); setNextCursor(data.nextCursor ?? null)
        currentCursor = data.hasMore ? data.nextCursor ?? null : null
      } catch { return }
    }
  }, [apiBase])

  const fetchPhotos = useCallback(async () => {
    preloadRunRef.current += 1
    try {
      setIsLoading(true)
      const response = await fetch(`${apiBase}/photos?limit=${PAGE_SIZE}`)
      if (!response.ok) return
      const data = (await response.json()) as PhotosPageResponse
      setPhotos(data.photos || []); setHasMore(Boolean(data.hasMore)); setNextCursor(data.nextCursor ?? null)
      if (data.hasMore && data.nextCursor) void fetchRemainingPhotos(data.nextCursor, preloadRunRef.current)
    } catch { /* ignore */ } finally { setIsLoading(false) }
  }, [apiBase, fetchRemainingPhotos])

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const response = await fetch(`${apiBase}/photos?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`)
      if (!response.ok) return
      const data = await response.json()
      setPhotos((prev) => [...prev, ...(data.photos || [])])
      setHasMore(Boolean(data.hasMore)); setNextCursor(data.nextCursor ?? null)
    } catch { /* ignore */ } finally { setIsLoadingMore(false) }
  }, [apiBase, isLoadingMore, nextCursor])

  useEffect(() => { fetchPhotos() }, [fetchPhotos])

  return { photos, isLoading, isLoadingMore, hasMore, loadMore, refetch: fetchPhotos }
}
