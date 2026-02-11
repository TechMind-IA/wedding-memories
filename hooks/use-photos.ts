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

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        console.log("[v0] Fetching photos from /api/photos")
        setIsLoading(true)
        const response = await fetch("/api/photos")

        if (!response.ok) {
          console.error("[v0] Failed to fetch photos:", response.status)
          setPhotos([])
          return
        }

        const data = await response.json()
        console.log("[v0] Fetched photos:", data.photos?.length || 0, "photos")
        setPhotos(data.photos || [])
      } catch (error) {
        console.error("[v0] Error fetching photos:", error)
        setPhotos([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPhotos()
  }, [])

  return { photos, isLoading }
}
