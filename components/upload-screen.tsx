"use client"

import React from "react"
import { useState, useRef } from "react"
import { ArrowLeft, Upload, ImagePlus, Check, X, Camera } from "lucide-react"
import Image from "next/image"
import { usePhotoUpload } from "@/hooks/use-photo-upload"

interface UploadScreenProps {
  onNavigate: (screen: string) => void
  onPhotoUploaded?: () => void
}

export function UploadScreen({ onNavigate, onPhotoUploaded }: UploadScreenProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploaderName, setUploaderName] = useState(() => {
    if (typeof window === "undefined") return ""
    return localStorage.getItem("guestName") ?? ""
  })
  const [fileTypes, setFileTypes] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const { uploadPhotos, isLoading: isUploading, error: uploadError, progress } = usePhotoUpload()

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    )

    const urls = newFiles.map((file) => URL.createObjectURL(file))
    const types = newFiles.map((file) => (file.type.startsWith("video/") ? "video" : "image"))

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
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
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
      await uploadPhotos(selectedFiles, uploaderName, fileTypes)
      setUploadSuccess(true)
      setSelectedFiles([])
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      setPreviewUrls([])
      setFileTypes([])
      setUploaderName("")
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
    setUploadSuccess(false)
    setUploaderName("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  return (
    <section className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
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
        <h2 className="font-serif text-lg font-bold text-foreground">Enviar fotos</h2>
        <div className="w-10" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col p-4 md:p-6">
        {uploadSuccess ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-foreground mb-2">
                Fotos enviadas com sucesso!
              </h3>
              <p className="font-sans text-foreground mb-6">
                Obrigado por fazer parte do nosso dia ❤️
              </p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => {
                  handleReset()
                  onNavigate("gallery")
                }}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-sans font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
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
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors p-8"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-sans font-semibold text-foreground">
                    Arraste fotos ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Imagens e vídeos até 100 MB
                  </p>
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      cameraInputRef.current?.click()
                    }}
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-sans font-semibold transition-colors hover:bg-muted"
                  >
                    <Camera className="h-4 w-4" />
                    Câmera
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-sans font-semibold transition-colors hover:bg-muted"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Galeria
                  </button>
                </div>
              </div>
            ) : (
              /* Grid de previews */
              <div className="grid grid-cols-3 gap-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                    {fileTypes[index] === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-foreground/10">
                        <p className="text-xs font-sans text-muted-foreground">Vídeo</p>
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
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-card transition-colors hover:border-primary/50 cursor-pointer"
                    >
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-sans">Câmera</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-card transition-colors hover:border-primary/50 cursor-pointer"
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

            {/* Contagem de arquivos */}
            {selectedFiles.length > 0 && (
              <p className="mt-4 text-sm text-muted-foreground font-sans">
                {`${selectedFiles.length} arquivo${selectedFiles.length > 1 ? "s" : ""} selecionado${selectedFiles.length > 1 ? "s" : ""}`}
              </p>
            )}

            {/* Nome do convidado */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-sans font-semibold text-foreground mb-2">
                  Seu nome (para identificar as fotos)
                </label>
                <input
                  type="text"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="Digite seu nome"
                  disabled={isUploading}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
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
                  className="w-full rounded-xl bg-primary px-6 py-4 text-base font-sans font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Enviando {progress}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Enviar agora
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
