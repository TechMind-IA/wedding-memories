/**
 * Nome: app/[accessCode]/[slug]/page.tsx
 * Função: Página principal do casamento — fluxo do convidado.
 */

"use client"

import { useState, useCallback, useEffect } from "react"
import { WelcomeScreen } from "@/components/welcome-screen"
import { UploadScreen } from "@/components/upload-screen"
import { GalleryScreen } from "@/components/gallery-screen"
import { GuestNameScreen } from "@/components/guest-name-screen"
import { preloadGalleryPhotos } from "@/lib/photo-preloader"
import { useWedding } from "@/components/wedding-provider"

export default function WeddingPage() {
  const { accessCode, slug } = useWedding()
  const apiBase = `/api/${accessCode}/${slug}`
  const [currentScreen, setCurrentScreen] = useState<string | null>(null)
  const [galleryRefresh, setGalleryRefresh] = useState(0)

  useEffect(() => {
    const savedName = localStorage.getItem(`guestName_${accessCode}`)
    setCurrentScreen(savedName ? "welcome" : "guest-name")
    preloadGalleryPhotos(apiBase)
  }, [apiBase])

  const handlePhotoUploaded = useCallback(() => {
    setGalleryRefresh((prev) => prev + 1)
    preloadGalleryPhotos(apiBase, { force: true })
  }, [apiBase])

  if (currentScreen === null) return null

  return (
    <main className="min-h-[100dvh]">
      {currentScreen === "guest-name" && (
        <GuestNameScreen onConfirm={() => setCurrentScreen("welcome")} />
      )}
      {currentScreen === "welcome" && (
        <WelcomeScreen onNavigate={setCurrentScreen} />
      )}
      {currentScreen === "upload" && (
        <UploadScreen onNavigate={setCurrentScreen} onPhotoUploaded={handlePhotoUploaded} />
      )}
      {currentScreen === "gallery" && (
        <GalleryScreen key={galleryRefresh} onNavigate={setCurrentScreen} />
      )}
    </main>
  )
}
