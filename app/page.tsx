"use client"

import { useState, useCallback, useEffect } from "react"
import { WelcomeScreen } from "@/components/welcome-screen"
import { UploadScreen } from "@/components/upload-screen"
import { GalleryScreen } from "@/components/gallery-screen"
import { GuestNameScreen } from "@/components/guest-name-screen"

export default function Page() {
  const [currentScreen, setCurrentScreen] = useState<string | null>(null)
  const [galleryRefresh, setGalleryRefresh] = useState(0)

  // Verifica localStorage ao montar — pula a tela de nome se já tiver salvo
  useEffect(() => {
    const savedName = localStorage.getItem("guestName")
    setCurrentScreen(savedName ? "welcome" : "guest-name")
  }, [])

  const handlePhotoUploaded = useCallback(() => {
    setGalleryRefresh((prev) => prev + 1)
  }, [])

  // Enquanto verifica o localStorage, não renderiza nada (evita flash)
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
