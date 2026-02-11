"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { usePhotos, type Photo } from "@/hooks/use-photos"

interface GalleryScreenProps {
  onNavigate: (screen: string) => void
}

export function GalleryScreen({ onNavigate }: GalleryScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [videoAspects, setVideoAspects] = useState<Record<string, "landscape" | "portrait">>({})
  const { photos, isLoading } = usePhotos()
  
  const FALLBACK_PHOTOS = [
    "/gallery/photo-1.jpg",
    "/gallery/photo-2.jpg",
    "/gallery/photo-3.jpg",
    "/gallery/photo-4.jpg",
    "/gallery/photo-5.jpg",
    "/gallery/photo-6.jpg",
    "/gallery/photo-7.jpg",
    "/gallery/photo-8.jpg",
    "/gallery/photo-9.jpg",
  ]
  
  const displayPhotos = photos.length > 0 ? photos : FALLBACK_PHOTOS.map((url) => ({
    id: url,
    created_at: new Date().toISOString(),
    file_path: url,
    file_name: url,
    file_size: 0,
    mime_type: "image/jpeg",
    storage_url: url,
  }))

  const handleVideoMetadata = (photoId: string, event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    const aspect = video.videoWidth > video.videoHeight ? "landscape" : "portrait"
    setVideoAspects((prev) => ({ ...prev, [photoId]: aspect }))
  }

  const handlePrev = useCallback(() => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex === 0 ? displayPhotos.length - 1 : selectedIndex - 1)
  }, [selectedIndex, displayPhotos.length])

  const handleNext = useCallback(() => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex === displayPhotos.length - 1 ? 0 : selectedIndex + 1)
  }, [selectedIndex, displayPhotos.length])

  const handleClose = useCallback(() => setSelectedIndex(null), [])

  useEffect(() => {
    if (selectedIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev()
      if (e.key === "ArrowRight") handleNext()
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedIndex, handlePrev, handleNext, handleClose])

  return (
    <section className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <button
          onClick={() => onNavigate("welcome")}
          className="flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex flex-col items-center gap-1">
          <h2 className="font-serif text-lg font-bold text-foreground">Brenda & Jamelão</h2>
          <p className="text-xs text-muted-foreground font-sans">Dezembro 2026 • Betim, MG</p>
        </div>
        <span className="text-xs text-muted-foreground font-sans rounded-full border border-border px-3 py-1">
          {isLoading ? "..." : `${displayPhotos.length} fotos`}
        </span>
      </div>

      {/* Gallery grid */}
      <div className="flex-1 px-3 py-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground font-sans">Carregando fotos...</p>
          </div>
        ) : displayPhotos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-lg font-serif text-foreground mb-2">Ainda não há fotos</p>
            <p className="text-sm text-muted-foreground font-sans">As fotos enviadas aparecerão aqui</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 auto-rows-max">
              {displayPhotos.map((photo, index) => {
                if (photo.is_video) {
                  const aspect = videoAspects[photo.id] || "landscape"
                  const isLandscape = aspect === "landscape"
                  const gridColsClass = isLandscape ? "col-span-2 md:col-span-4" : "col-span-1 md:col-span-2"
                  const aspectClass = isLandscape ? "aspect-video" : "aspect-[3/4]"

                  return (
                    <div
                      key={photo.id}
                      className={`group relative overflow-hidden rounded-xl bg-foreground/10 ${gridColsClass} ${aspectClass}`}
                    >
                      <video
                        src={photo.storage_url}
                        className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                        muted
                        autoPlay
                        loop
                        playsInline
                        onLoadedMetadata={(e) => handleVideoMetadata(photo.id, e)}
                      />
                      <button
                        onClick={() => setSelectedIndex(index)}
                        type="button"
                        className="absolute inset-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        aria-label={`Abrir vídeo ${index + 1}`}
                      />
                      <div className="absolute inset-0 bg-foreground/0 transition-colors duration-300 group-hover:bg-foreground/10 pointer-events-none" />
                      {photo.uploader_name && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 to-transparent px-2 py-2">
                          <p className="text-xs font-sans text-background truncate">
                            {photo.uploader_name}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                } else {
                  return (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedIndex(index)}
                      type="button"
                      className="group relative col-span-1 aspect-square overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label={`Abrir foto ${index + 1}`}
                    >
                      <Image
                        src={photo.storage_url || "/placeholder.svg"}
                        alt={`Foto ${index + 1} do casamento`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-foreground/0 transition-colors duration-300 group-hover:bg-foreground/10 pointer-events-none" />
                      {photo.uploader_name && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 to-transparent px-2 py-2">
                          <p className="text-xs font-sans text-background truncate">
                            {photo.uploader_name}
                          </p>
                        </div>
                      )}
                    </button>
                  )
                }
              })}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Visualizar foto"
        >
          {/* Close button - positioned at top left to avoid video controls */}
          <button
            onClick={() => setSelectedIndex(null)}
            type="button"
            className="absolute top-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-background/90 text-foreground transition-colors hover:bg-background"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Previous button */}
          <button
            onClick={handlePrev}
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 text-background transition-colors hover:bg-background/30"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Media container */}
          <div className="relative w-full max-w-[95vw] max-h-[calc(100vh-120px)] flex flex-col bg-foreground/30 rounded-2xl overflow-hidden">
            <div className="relative flex-1 flex items-center justify-center w-full min-h-0">
              {selectedIndex !== null && displayPhotos[selectedIndex] && (
                <>
                  {displayPhotos[selectedIndex].is_video ? (
                    <video
                      src={displayPhotos[selectedIndex].storage_url}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <Image
                        src={displayPhotos[selectedIndex].storage_url || "/placeholder.svg"}
                        alt={`Foto ${selectedIndex + 1} do casamento`}
                        fill
                        className="object-contain"
                        sizes="95vw"
                        priority
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Uploader name */}
            {selectedIndex !== null && displayPhotos[selectedIndex]?.uploader_name && (
              <div className="bg-background/95 px-4 py-3 text-center border-t border-background/40 flex-shrink-0">
                <p className="text-sm font-sans text-foreground font-semibold break-words">
                  Por {displayPhotos[selectedIndex].uploader_name}
                </p>
              </div>
            )}
          </div>

          {/* Next button */}
          <button
            onClick={handleNext}
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 text-background transition-colors hover:bg-background/30"
            aria-label="Próxima foto"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Photo counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <span className="text-sm text-background/70 font-sans">
              {selectedIndex !== null ? `${selectedIndex + 1} / ${displayPhotos.length}` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border px-4 py-4 text-center">
        <p className="text-xs font-sans text-muted-foreground">
          Com carinho, Brenda & Jamelão 💍
        </p>
      </div>
    </section>
  )
}
