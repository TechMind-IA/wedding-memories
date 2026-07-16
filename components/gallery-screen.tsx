/**
 * Nome: components/gallery-screen.tsx
 * Função: Renderiza a tela ou componente Gallery Screen da experiência de convidados.
 */

"use client"

import React from "react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { ArrowLeft, X, ChevronLeft, ChevronRight, Download, Trash2, Plus } from "lucide-react"
import Image from "next/image"
import { useWedding } from "@/components/wedding-provider"
import { usePhotos, type Photo } from "@/hooks/use-photos"
import { useReactionsBatch } from "@/hooks/use-reactions"
import { PhotoReactions } from "@/components/photo-reactions"

interface GalleryScreenProps {
  onNavigate: (screen: string) => void
}

const EMPTY_REACTIONS: [] = []
const LIGHTBOX_IMAGE_QUALITY = 35
const LIGHTBOX_ACTION_BUTTON_CLASS =
  "text-white transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
const LIGHTBOX_DANGER_BUTTON_CLASS =
  "text-white transition-colors hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"

function AutoplayGalleryVideo({
  src,
  className,
  onLoadedMetadata,
}: {
  src: string
  className?: string
  onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldPlay, setShouldPlay] = useState(false)

  const playWhenReady = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true
    video.playsInline = true
    video.play().catch(() => {})
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => setShouldPlay(entry.isIntersecting),
      { rootMargin: "220px 0px", threshold: 0.1 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (shouldPlay) {
      playWhenReady()
    } else {
      video.pause()
    }
  }, [playWhenReady, shouldPlay])

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      muted
      loop
      playsInline
      preload="metadata"
      onLoadedMetadata={onLoadedMetadata}
      onCanPlay={() => {
        if (shouldPlay) playWhenReady()
      }}
    />
  )
}

// ─── Modal de confirmação de exclusão com senha ──────────────────────────────
function DeleteModal({
  onConfirm,
  onCancel,
  isDeleting,
  errorMessage,
}: {
  onConfirm: (password: string) => void
  onCancel: () => void
  isDeleting: boolean
  errorMessage: string | null
}) {
  const [password, setPassword] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleSubmit = () => {
    if (!password.trim()) return
    onConfirm(password)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
    if (e.key === "Escape") onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/65 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-background rounded-2xl shadow-[0_20px_48px_hsl(var(--foreground)/0.24)] border border-border w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-foreground">Excluir foto</h3>
          <button
            onClick={onCancel}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground font-sans">
          Esta ação é permanente e não pode ser desfeita.
          Digite a senha de administrador para confirmar.
        </p>

        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="password"
            placeholder="Senha de exclusão"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDeleting}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          {errorMessage && (
            <p className="text-xs text-red-500 font-sans">{errorMessage}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-sans font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isDeleting || !password.trim()}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-sans font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Excluir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export function GalleryScreen({ onNavigate }: GalleryScreenProps) {
  const { accessCode, slug, coupleNames, weddingDate } = useWedding()
  const apiBase = `/api/${accessCode}/${slug}`
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [videoAspects, setVideoAspects] = useState<Record<string, "landscape" | "portrait">>({})
  const [isDownloading, setIsDownloading] = useState(false)

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { photos, isLoading, isLoadingMore, hasMore, loadMore, refetch } = usePhotos(apiBase)

  const [selectedUploader, setSelectedUploader] = useState<string | null>(null)
  const uploaders = useMemo(() => [...new Set(photos.map((p) => p.uploader_name).filter(Boolean) as string[])], [photos])
  const displayPhotos = useMemo(() => selectedUploader ? photos.filter((p) => p.uploader_name === selectedUploader) : photos, [photos, selectedUploader])
  const photoIds = useMemo(() => displayPhotos.map((photo) => photo.id), [displayPhotos])
  const { reactionsMap } = useReactionsBatch(photoIds, apiBase, accessCode)
  const photoIndexMap = useMemo(
    () => new Map(displayPhotos.map((p, i) => [p.id, i])),
    [displayPhotos]
  )

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

  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const delta = e.changedTouches[0].clientX - touchStartX.current
      touchStartX.current = null
      if (Math.abs(delta) < 50) return
      if (delta < 0) handleNext()
      else handlePrev()
    },
    [handleNext, handlePrev],
  )

  const handleDownload = async () => {
    if (selectedIndex === null) return
    const photo = displayPhotos[selectedIndex]
    setIsDownloading(true)
    try {
      const proxyUrl = `${apiBase}/download?url=${encodeURIComponent(photo.storage_url)}&filename=${encodeURIComponent(photo.file_name || `foto-${selectedIndex + 1}`)}`
      const response = await fetch(proxyUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = photo.file_name || `foto-${selectedIndex + 1}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[download] Erro ao baixar arquivo:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDeleteRequest = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteTargetId(photoId)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async (password: string) => {
    if (!deleteTargetId) return
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const res = await fetch(`${apiBase}/photos/${deleteTargetId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setDeleteError(data.error ?? "Erro ao excluir")
        setIsDeleting(false)
        return
      }

      if (selectedIndex !== null && displayPhotos[selectedIndex]?.id === deleteTargetId) {
        if (displayPhotos.length <= 1) {
          setSelectedIndex(null)
        } else if (selectedIndex >= displayPhotos.length - 1) {
          setSelectedIndex(selectedIndex - 1)
        }
      }

      setDeleteTargetId(null)
      await refetch()
    } catch {
      setDeleteError("Falha ao excluir. Tente novamente.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setDeleteTargetId(null)
      setDeleteError(null)
    }
  }

  useEffect(() => {
    if (selectedIndex === null) return
    if (selectedIndex >= displayPhotos.length) {
      setSelectedIndex(null)
      return
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev()
      if (e.key === "ArrowRight") handleNext()
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedIndex, displayPhotos.length, handlePrev, handleNext, handleClose])

  const renderPhotoCard = (photo: Photo) => {
    const index = photoIndexMap.get(photo.id) ?? 0

    if (photo.is_video) {
      const aspect = videoAspects[photo.id] || "landscape"
      const aspectClass = aspect === "landscape" ? "aspect-video" : "aspect-[3/4]"
      return (
        <div
          key={photo.id}
          className="group mb-3 break-inside-avoid overflow-hidden rounded-[10px] border border-border/55 bg-card/80 shadow-[0_10px_28px_hsl(var(--foreground)/0.05)] ring-1 ring-background/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-[0_16px_36px_hsl(var(--foreground)/0.10)]"
        >
          {photo.uploader_name && (
            <p className="truncate px-2.5 py-2 font-sans text-xs font-semibold text-muted-foreground">
              {photo.uploader_name}
            </p>
          )}
          <div className={`relative overflow-hidden bg-foreground/10 ${aspectClass}`}>
            <AutoplayGalleryVideo
              src={photo.storage_url}
              className="w-full h-full object-contain group-hover:scale-[1.015] transition-transform duration-500"
              onLoadedMetadata={(e) => handleVideoMetadata(photo.id, e)}
            />
            <button
              onClick={() => setSelectedIndex(index)}
              type="button"
              className="absolute inset-0 cursor-pointer focus:outline-none"
              aria-label={`Abrir vídeo ${index + 1}`}
            />
            <button
              onClick={(e) => handleDeleteRequest(photo.id, e)}
              type="button"
              className="absolute top-2 right-2 z-10 text-red-400 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100"
              aria-label="Excluir"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
          <PhotoReactions
            photoId={photo.id}
            apiBase={apiBase}
            variant="card"
            initialReactions={reactionsMap[photo.id] ?? EMPTY_REACTIONS}
          />
        </div>
      )
    }

    return (
      <div
        key={photo.id}
        className="group mb-3 break-inside-avoid overflow-hidden rounded-[10px] border border-border/55 bg-card/80 shadow-[0_10px_28px_hsl(var(--foreground)/0.05)] ring-1 ring-background/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-[0_16px_36px_hsl(var(--foreground)/0.10)]"
      >
        {photo.uploader_name && (
          <p className="truncate px-2.5 py-2 font-sans text-xs font-semibold text-muted-foreground">
            {photo.uploader_name}
          </p>
        )}
        <div
          className="relative aspect-square cursor-pointer overflow-hidden bg-foreground/10"
          onClick={() => setSelectedIndex(index)}
        >
          <Image
            src={photo.storage_url || "/placeholder.svg"}
            alt={`Foto de ${photo.uploader_name ?? "convidado"}`}
            fill
            className="object-cover group-hover:scale-[1.025] transition-transform duration-500"
            sizes="(max-width: 768px) 46vw, 22vw"
            quality={40}
          />
          <button
            onClick={(e) => handleDeleteRequest(photo.id, e)}
            type="button"
            className="absolute top-2 right-2 z-10 text-red-400 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100"
            aria-label="Excluir"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
        <PhotoReactions
          photoId={photo.id}
          apiBase={apiBase}
          variant="card"
          initialReactions={reactionsMap[photo.id] ?? EMPTY_REACTIONS}
        />
      </div>
    )
  }

  return (
    <section className="flex min-h-[100dvh] flex-col bg-background">

      {deleteTargetId && (
        <DeleteModal
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={isDeleting}
          errorMessage={deleteError}
        />
      )}

      <div className="sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm">
        <button
          onClick={() => onNavigate("welcome")}
          className="flex items-center gap-2 justify-self-start text-sm font-sans text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <h2 className="font-montserrat text-sm font-semibold uppercase tracking-[0.08em] text-accent">
            {coupleNames}
          </h2>
          <p className="font-montserrat text-xs font-semibold leading-none tracking-[0.2em] text-accent">
            {weddingDate}
          </p>
        </div>
      </div>

      {uploaders.length > 1 && (
        <div className="sticky top-[73px] z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
          <select
            value={selectedUploader ?? ""}
            onChange={(e) => setSelectedUploader(e.target.value || null)}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Todas as pessoas</option>
            {uploaders.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 px-3 pb-24 pt-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground font-sans">Preparando as memórias...</p>
          </div>
        ) : displayPhotos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-20">
            <p className="text-lg font-serif text-foreground mb-2">
              {photos.length === 0 ? "Ainda não há memórias" : "Nenhuma memória encontrada"}
            </p>
            <p className="text-sm text-muted-foreground font-sans">
              {photos.length === 0
                ? "As lembranças compartilhadas aparecerão aqui"
                : "Tente limpar ou mudar os filtros selecionados"}
            </p>
          </div>
        ) : (
          <div className="columns-2 gap-2 md:columns-4">
            {displayPhotos.map((photo) => renderPhotoCard(photo))}
          </div>
        )}

        {!isLoading && hasMore && (
          <div className="flex justify-center py-8">
            <button
              onClick={loadMore}
              type="button"
              disabled={isLoadingMore}
              className="rounded-full border border-border bg-card px-5 py-3 text-sm font-sans font-semibold text-foreground shadow-[0_8px_20px_hsl(var(--foreground)/0.06)] transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingMore ? "Buscando memórias..." : "Ver mais lembranças"}
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => onNavigate("upload")}
        type="button"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_32px_hsl(var(--primary)/0.28)] transition-transform hover:scale-105 active:scale-95"
        aria-label="Adicionar fotos"
      >
        <Plus className="h-7 w-7" />
      </button>

      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground/95 md:p-4"
          onClick={handleClose}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="relative flex h-[90vh] w-full max-w-[96vw] items-center justify-center overflow-hidden rounded-[10px] border border-background/10 bg-background/[0.04] shadow-[0_22px_70px_rgba(0,0,0,0.42)] md:h-[82vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute left-4 right-4 top-8 z-10 grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload() }}
                type="button"
                className={LIGHTBOX_ACTION_BUTTON_CLASS}
                aria-label="Baixar"
              >
                {isDownloading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Download className="h-6 w-6" />
                )}
              </button>

              <p className="min-w-0 truncate text-center text-md font-sans font-semibold text-white/80 ml-8">
                {displayPhotos[selectedIndex]?.uploader_name ?? ""}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => handleDeleteRequest(displayPhotos[selectedIndex].id, e)}
                  type="button"
                  className="text-red-400 transition-colors hover:text-red-300"
                  aria-label="Excluir foto"
                >
                  <Trash2 className="h-6 w-6" />
                </button>
                <button
                  onClick={handleClose}
                  type="button"
                  className={LIGHTBOX_DANGER_BUTTON_CLASS}
                  aria-label="Fechar"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handlePrev() }}
              type="button"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-background/80 transition-colors hover:text-background md:left-4"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>

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
                  sizes="(max-width: 768px) 72vw, 36vw"
                  quality={LIGHTBOX_IMAGE_QUALITY}
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            )}

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2" onClick={(e) => e.stopPropagation()}>
              <PhotoReactions
                photoId={displayPhotos[selectedIndex].id}
                apiBase={apiBase}
                variant="lightbox"
              />
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleNext() }}
              type="button"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-background/80 transition-colors hover:text-background md:right-4"
              aria-label="Próxima foto"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
