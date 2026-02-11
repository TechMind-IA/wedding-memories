"use client"

import { useState, useCallback } from "react"
import { WelcomeScreen } from "@/components/welcome-screen"
import { UploadScreen } from "@/components/upload-screen"
import { GalleryScreen } from "@/components/gallery-screen"

export default function Page() {
  const [currentScreen, setCurrentScreen] = useState("welcome")
  const [galleryRefresh, setGalleryRefresh] = useState(0)

  const handlePhotoUploaded = useCallback(() => {
    setGalleryRefresh((prev) => prev + 1)
  }, [])

  return (
    <main className="min-h-[100dvh]">
      {currentScreen === "welcome" && (
        <WelcomeScreen onNavigate={setCurrentScreen} />
      )}
      {currentScreen === "upload" && (
        <UploadScreen
          onNavigate={setCurrentScreen}
          onPhotoUploaded={handlePhotoUploaded}
        />
      )}
      {currentScreen === "gallery" && (
        <GalleryScreen key={galleryRefresh} onNavigate={setCurrentScreen} />
      )}
    </main>
  )
}
