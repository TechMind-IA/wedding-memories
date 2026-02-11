"use client"

import { useState } from "react"

interface UploadProgress {
  isLoading: boolean
  error: string | null
  success: boolean
}

export function usePhotoUpload() {
  const [progress, setProgress] = useState<UploadProgress>({
    isLoading: false,
    error: null,
    success: false,
  })

  const uploadPhotos = async (files: File[], uploaderName: string, fileTypes: string[]) => {
    setProgress({ isLoading: true, error: null, success: false })

    try {
      console.log("[v0] Starting upload with files:", files.length, "for uploader:", uploaderName)
      
      const formData = new FormData()
      formData.append("uploader_name", uploaderName)
      files.forEach((file, index) => {
        console.log("[v0] Adding file:", file.name, "type:", fileTypes[index])
        formData.append("files", file)
        formData.append(`file_type_${index}`, fileTypes[index] || "image")
      })

      console.log("[v0] Sending request to /api/upload")
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        const data = await response.json()
        console.error("[v0] Upload error response:", data)
        throw new Error(data.error || "Upload failed")
      }

      const data = await response.json()
      console.log("[v0] Upload successful, urls:", data.urls)
      setProgress({ isLoading: false, error: null, success: true })
      return data.urls
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed"
      console.error("[v0] Upload error:", errorMessage, error)
      setProgress({ isLoading: false, error: errorMessage, success: false })
      throw error
    }
  }

  return {
    uploadPhotos,
    isLoading: progress.isLoading,
    error: progress.error,
    success: progress.success,
  }
}
