/**
 * Nome: components/upload-screen.tsx
 * Função: Renderiza a tela ou componente Upload Screen da experiência de convidados.
 */

"use client"

import React from "react"
import { useState, useRef } from "react"
import { ArrowLeft, Upload, ImagePlus, Check, X, Camera, Heart } from "lucide-react"
import Image from "next/image"
import { usePhotoUpload } from "@/hooks/use-photo-upload"

interface UploadScreenProps {
  onNavigate: (screen: string) => void
  onPhotoUploaded?: () => void
}

const MAX_UPLOAD_BATCH_SIZE = 100 * 1024 * 1024

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function VideoPreview({ src }: { src: string }) {
  return (
    <video
      src={src}
      className="h-full w-full object-cover"
      muted
      playsInline
      preload="metadata"
    />
  )
}

export function UploadScreen({ onNavigate, onPhotoUploaded }: UploadScreenProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [uploaderName, setUploaderName] = useState(() => {
    if (typeof window === "undefined") return ""
    return localStorage.getItem("guestName") ?? ""
  })
  const [fileTypes, setFileTypes] = useState<string[]>([])
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const { uploadPhotos, isLoading: isUploading, error: uploadError, progress } = usePhotoUpload()

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    )

    const currentTotal = selectedFiles.reduce((acc, file) => acc + file.size, 0)
    const newTotal = newFiles.reduce((acc, file) => acc + file.size, 0)

    if (currentTotal + newTotal > MAX_UPLOAD_BATCH_SIZE) {
      setSelectionError(
        `Este envio pode ter no máximo 100 MB. Selecionado: ${formatFileSize(currentTotal + newTotal)}.`
      )
      return
    }

    const urls = newFiles.map((file) => URL.createObjectURL(file))
    const types = newFiles.map((file) => (file.type.startsWith("video/") ? "video" : "image"))

    setSelectionError(null)
    setSelectedFiles((prev) => [...prev, ...newFiles])
    setPreviewUrls((prev) => [...prev, ...urls])
    setFileTypes((prev) => [...prev, ...types])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
    e.target.value = ""
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleRemovePhoto = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviewUrls((prev) => {
      const newUrls = [...prev]
      URL.revokeObjectURL(newUrls[index])
      return newUrls.filter((_, i) => i !== index)
    })
    setFileTypes((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !uploaderName.trim()) return

    try {
      const count = selectedFiles.length
      const trimmedName = uploaderName.trim()
      await uploadPhotos(selectedFiles, uploaderName, fileTypes)
      localStorage.setItem("guestName", trimmedName)
      setUploadedCount(count)
      setUploadSuccess(true)
      setSelectedFiles([])
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      setPreviewUrls([])
      setFileTypes([])
      setUploaderName(trimmedName)
      setSelectionError(null)
      onPhotoUploaded?.()
    } catch (error) {
      console.error("[upload] Erro:", error)
    }
  }

  const handleReset = () => {
    setSelectedFiles([])
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    setPreviewUrls([])
    setFileTypes([])
    setSelectionError(null)
    setUploadSuccess(false)
    setUploadedCount(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  return (
    <section className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-background/95 px-4 py-4">
        <button
          onClick={() => {
            handleReset()
            onNavigate("welcome")
          }}
          className="flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <h2 className="font-serif text-lg font-bold text-foreground">Compartilhar memórias</h2>
        <div className="w-10" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col p-4 md:p-6">
        {uploadSuccess ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 shadow-[0_14px_32px_hsl(var(--primary)/0.16)]">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-foreground mb-2">
                Memórias recebidas com carinho!
              </h3>
              <p className="font-sans text-foreground mb-6">
                {uploadedCount === 1
                  ? "1 memória foi adicionada ao álbum. Obrigado por fazer parte do nosso dia ❤️"
                  : `${uploadedCount} memórias foram adicionadas ao álbum. Obrigado por fazer parte do nosso dia ❤️`}
              </p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => {
                  handleReset()
                  onNavigate("gallery")
                }}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-sans font-semibold text-primary-foreground shadow-[0_10px_24px_hsl(var(--primary)/0.2)] transition-colors hover:bg-primary/90"
              >
                Ver galeria
              </button>
              <button
                onClick={handleReset}
                className="flex-1 rounded-lg bg-secondary px-4 py-2 text-sm font-sans font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                Enviar mais
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Input galeria */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleInputChange}
              className="hidden"
              aria-label="Selecionar fotos e vídeos"
            />

            {/* Input câmera */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              className="hidden"
              aria-label="Tirar foto"
            />

            {selectedFiles.length === 0 ? (
              /* Drop zone vazia */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed bg-card/55 p-8 text-center shadow-[0_14px_36px_hsl(var(--foreground)/0.06)] transition-all cursor-pointer ${
                  isDragActive
                    ? "border-primary bg-primary/[0.08] shadow-[0_18px_40px_hsl(var(--primary)/0.14)]"
                    : "border-accent/70 hover:border-primary/55 hover:bg-card/80"
                }`}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Heart className="h-9 w-9" />
                </div>
                <div className="text-center">
                  <p className="font-serif text-2xl font-bold text-foreground">
                    Envie suas fotos e vídeos
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Arraste aqui ou escolha da galeria. Até 100 MB por envio.
                  </p>
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      cameraInputRef.current?.click()
                    }}
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-4 py-2 text-sm font-sans font-semibold transition-colors hover:bg-secondary"
                  >
                    <Camera className="h-4 w-4" />
                    Câmera
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-4 py-2 text-sm font-sans font-semibold transition-colors hover:bg-secondary"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Galeria
                  </button>
                </div>
              </div>
            ) : (
              /* Grid de previews */
              <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-border/70 bg-muted shadow-[0_8px_20px_hsl(var(--foreground)/0.06)]">
                    {fileTypes[index] === "video" ? (
                      <div className="relative h-full w-full bg-foreground/10">
                        <VideoPreview src={url} />
                        <div className="absolute bottom-2 left-2 rounded-full bg-foreground/70 px-2 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wide text-background">
                          Vídeo
                        </div>
                      </div>
                    ) : (
                      <Image
                        src={url || "/placeholder.svg"}
                        alt={`Foto ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    )}
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      type="button"
                      disabled={isUploading}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/70 text-background transition-opacity hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Remover"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Botões de adicionar mais */}
                {!isUploading && (
                  <>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      type="button"
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-accent/70 bg-card/70 transition-colors hover:border-primary/55 cursor-pointer"
                    >
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-sans">Câmera</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-accent/70 bg-card/70 transition-colors hover:border-primary/55 cursor-pointer"
                    >
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-sans">Galeria</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {uploadError && (
              <p className="mt-4 text-sm text-red-600 font-sans">{uploadError}</p>
            )}

            {selectionError && (
              <p className="mt-4 text-sm text-red-600 font-sans">{selectionError}</p>
            )}

            {/* Contagem de arquivos */}
            {selectedFiles.length > 0 && (
              <p className="mt-4 rounded-full border border-border bg-card/65 px-4 py-2 text-sm text-muted-foreground font-sans">
                {`${selectedFiles.length} arquivo${selectedFiles.length > 1 ? "s" : ""} selecionado${selectedFiles.length > 1 ? "s" : ""} • ${formatFileSize(selectedFiles.reduce((acc, file) => acc + file.size, 0))} de 100 MB`}
              </p>
            )}

            {/* Nome do convidado */}
            {selectedFiles.length > 0 && (
              <div className="mt-5">
                <label className="block text-sm font-sans font-semibold text-foreground mb-2">
                  Seu nome para assinarmos as memórias
                </label>
                <input
                  type="text"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="Digite seu nome"
                  disabled={isUploading}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary disabled:opacity-50"
                />
              </div>
            )}

            {/* Progress bar */}
            {isUploading && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-sans font-semibold text-foreground">
                    Enviando...
                  </span>
                  <span className="text-sm font-sans font-semibold text-primary">
                    {progress}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Botão enviar */}
            {selectedFiles.length > 0 && uploaderName.trim() && (
              <div className="mt-auto pt-8 pb-4">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  type="button"
                  className="w-full rounded-xl bg-primary px-6 py-4 text-base font-sans font-semibold text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.22)] transition-all hover:bg-primary/90 hover:shadow-[0_16px_32px_hsl(var(--primary)/0.28)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Enviando {progress}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Compartilhar agora
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
