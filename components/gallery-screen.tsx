"use client"

import React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { ArrowLeft, X, ChevronLeft, ChevronRight, Download, Trash2, Plus } from "lucide-react"
import Image from "next/image"
import { usePhotos, type Photo } from "@/hooks/use-photos"
import { groupPhotosByTimeline } from "@/lib/timeline"
import { PhotoReactions } from "@/components/photo-reactions"

interface GalleryScreenProps {
  onNavigate: (screen: string) => void
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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

        {/* Input de senha */}
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

        {/* Botões */}
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [videoAspects, setVideoAspects] = useState<Record<string, "landscape" | "portrait">>({})
  const [isDownloading, setIsDownloading] = useState(false)

  // Estado para exclusão
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { photos, isLoading, refetch } = usePhotos()

  const displayPhotos: Photo[] = photos
  const timelineGroups = groupPhotosByTimeline(photos)
  const photoIndexMap = new Map(displayPhotos.map((p, i) => [p.id, i]))

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

  // ─── Swipe touch para mobile ─────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const delta = e.changedTouches[0].clientX - touchStartX.current
      touchStartX.current = null
      if (Math.abs(delta) < 50) return  // movimento mínimo para não disparar em taps
      if (delta < 0) handleNext()        // arrastar ← → próxima foto
      else handlePrev()                  // arrastar → → foto anterior
    },
    [handleNext, handlePrev],
  )

  const handleDownload = async () => {
    if (selectedIndex === null) return
    const photo = displayPhotos[selectedIndex]
    setIsDownloading(true)
    try {
      const proxyUrl = `/api/download?url=${encodeURIComponent(photo.storage_url)}&filename=${encodeURIComponent(photo.file_name || `foto-${selectedIndex + 1}`)}`
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

  // ─── Exclusão com senha ──────────────────────────────────────────────────
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
      const res = await fetch(`/api/photos/${deleteTargetId}`, {
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

      // Ajusta o lightbox se a foto excluída estava aberta
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev()
      if (e.key === "ArrowRight") handleNext()
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedIndex, handlePrev, handleNext, handleClose])

  // ─── Renderiza um card de foto/vídeo ────────────────────────────────────
  const renderPhotoCard = (photo: Photo) => {
    const index = photoIndexMap.get(photo.id) ?? 0

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
            className="absolute inset-0 cursor-pointer focus:outline-none"
            aria-label={`Abrir vídeo ${index + 1}`}
          />
          {/* Botão excluir */}
          <button
            onClick={(e) => handleDeleteRequest(photo.id, e)}
            type="button"
            className="absolute top-2 right-2 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            aria-label="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {photo.uploader_name && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 to-transparent px-2 py-2 pointer-events-none">
              <p className="text-xs font-sans text-background truncate">{photo.uploader_name}</p>
            </div>
          )}
          <PhotoReactions photoId={photo.id} variant="card" />
        </div>
      )
    }

    return (
      <div
        key={photo.id}
        className="group relative aspect-square overflow-hidden rounded-xl bg-foreground/10 cursor-pointer"
        onClick={() => setSelectedIndex(index)}
      >
        <Image
          src={photo.storage_url || "/placeholder.svg"}
          alt={`Foto de ${photo.uploader_name ?? "convidado"}`}
          fill
          className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
          sizes="(max-width: 768px) 50vw, 25vw"
          quality={75}
        />
        {photo.uploader_name && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 to-transparent px-2 py-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-xs font-sans text-background truncate">{photo.uploader_name}</p>
          </div>
        )}
        {/* Botão excluir */}
        <button
          onClick={(e) => handleDeleteRequest(photo.id, e)}
          type="button"
          className="absolute top-2 right-2 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          aria-label="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <PhotoReactions photoId={photo.id} variant="card" />
      </div>
    )
  }

  return (
    <section className="flex min-h-screen flex-col bg-background">

      {/* Modal de exclusão */}
      {deleteTargetId && (
        <DeleteModal
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={isDeleting}
          errorMessage={deleteError}
        />
      )}

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
          <h2 className="font-serif text-lg font-bold text-foreground">Brenda & Jonathas</h2>
          <p className="text-xs text-muted-foreground font-sans">Dezembro 2026 • Betim, MG</p>
        </div>
        <span className="text-xs text-muted-foreground font-sans rounded-full border border-border px-3 py-1">
          {isLoading ? "..." : `${displayPhotos.length} fotos`}
        </span>
      </div>

      {/* Gallery com timeline */}
      <div className="flex-1 px-3 py-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground font-sans">Carregando fotos...</p>
          </div>
        ) : displayPhotos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-20">
            <p className="text-lg font-serif text-foreground mb-2">Ainda não há fotos</p>
            <p className="text-sm text-muted-foreground font-sans">As fotos enviadas aparecerão aqui</p>
          </div>
        ) : timelineGroups.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 auto-rows-max">
            {displayPhotos.map((photo) => renderPhotoCard(photo))}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {timelineGroups.map(({ event, photos: groupPhotos }) => (
              <div key={event.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wider">
                      {event.label}
                    </span>
                    <span className="text-xs font-sans text-muted-foreground">
                      {groupPhotos.length} {groupPhotos.length === 1 ? "foto" : "fotos"}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 auto-rows-max">
                  {groupPhotos.map((photo) => renderPhotoCard(photo))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB — Adicionar fotos */}
      <button
        onClick={() => onNavigate("upload")}
        type="button"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Adicionar fotos"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground/95 p-4"
          onClick={handleClose}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Botão fechar */}
          <button
            onClick={handleClose}
            type="button"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 text-background hover:bg-background/30"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Botão download */}
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload() }}
            type="button"
            className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 text-background hover:bg-background/30"
            aria-label="Baixar"
          >
            {isDownloading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              <Download className="h-5 w-5" />
            )}
          </button>

          {/* Botão excluir no lightbox */}
          <button
            onClick={(e) => handleDeleteRequest(displayPhotos[selectedIndex].id, e)}
            type="button"
            className="absolute right-16 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/60 text-white hover:bg-red-500/90 transition-colors"
            aria-label="Excluir foto"
          >
            <Trash2 className="h-5 w-5" />
          </button>

          {/* Anterior */}
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev() }}
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 text-background hover:bg-background/30"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Mídia */}
          <div
            className="relative w-full max-w-[95vw] h-[75vh] rounded-2xl overflow-hidden bg-foreground/30 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
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
                  quality={65}
                  priority
                />
              </div>
            )}
          </div>

          {/* Reações no lightbox */}
          <div onClick={(e) => e.stopPropagation()}>
            <PhotoReactions
              photoId={displayPhotos[selectedIndex].id}
              variant="lightbox"
            />
          </div>

          {/* Nome + contador */}
          <div className="flex flex-col items-center gap-1">
            {displayPhotos[selectedIndex]?.uploader_name && (
              <p className="text-sm font-sans text-background/80 font-semibold">
                Por {displayPhotos[selectedIndex].uploader_name}
              </p>
            )}
            <span className="text-sm text-background/50 font-sans">
              {selectedIndex + 1} / {displayPhotos.length}
            </span>
          </div>

          {/* Próximo */}
          <button
            onClick={(e) => { e.stopPropagation(); handleNext() }}
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 text-background hover:bg-background/30"
            aria-label="Próxima foto"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border px-4 py-4 text-center">
        <p className="text-xs font-sans text-muted-foreground">
          Com carinho, Brenda & Jonathas 💍
        </p>
      </div>
    </section>
  )
}
