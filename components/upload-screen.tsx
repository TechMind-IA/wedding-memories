"use client"

import React from "react"

import { useState, useRef } from "react"
import { ArrowLeft, Upload, ImagePlus, Check, X } from "lucide-react"
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
  const [uploaderName, setUploaderName] = useState("")
  const [fileTypes, setFileTypes] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadPhotos, isLoading: isUploading, error: uploadError } = usePhotoUpload()

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/") || file.type.startsWith("video/")
    )

    const urls = newFiles.map((file) => URL.createObjectURL(file))
    const types = newFiles.map((file) => (file.type.startsWith("video/") ? "video" : "image"))
    
    setSelectedFiles((prev) => [...prev, ...newFiles])
    setPreviewUrls((prev) => [...prev, ...urls])
    setFileTypes((prev) => [...prev, ...types])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
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
    if (selectedFiles.length === 0 || !uploaderName.trim()) {
      console.log("[v0] Upload blocked - files:", selectedFiles.length, "name:", uploaderName)
      return
    }

    try {
      console.log("[v0] Starting handleUpload")
      await uploadPhotos(selectedFiles, uploaderName, fileTypes)
      console.log("[v0] Upload successful, showing success message")
      setUploadSuccess(true)
      setSelectedFiles([])
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      setPreviewUrls([])
      setFileTypes([])
      setUploaderName("")
      onPhotoUploaded?.()
    } catch (error) {
      console.error("[v0] handleUpload error:", error)
    }
  }

  const handleReset = () => {
    setSelectedFiles([])
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    setPreviewUrls([])
    setFileTypes([])
    setUploadSuccess(false)
    setUploaderName("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleInputChange}
              className="hidden"
              aria-label="Selecionar fotos e vídeos"
            />

            {selectedFiles.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border bg-card p-12 transition-colors hover:border-primary/50 hover:bg-secondary/50 cursor-pointer"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click()
                  }
                }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <ImagePlus className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-base font-sans font-bold text-foreground">
                    {"Toque para selecionar fotos ou vídeos"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground font-sans">
                    {"ou arraste e solte aqui"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground font-sans">
                  {"JPG, PNG, MP4, WebM — até 100MB cada"}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  {previewUrls.map((url, index) => (
                    <div
                      key={index}
                      className="group relative aspect-square overflow-hidden rounded-xl bg-secondary"
                    >
                      {fileTypes[index] === "video" ? (
                        <div className="w-full h-full flex items-center justify-center bg-foreground/10">
                          <div className="text-center">
                            <p className="text-xs font-sans text-muted-foreground">Vídeo</p>
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
                        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/70 text-background transition-opacity hover:bg-foreground/90"
                        aria-label="Remover"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-card transition-colors hover:border-primary/50 cursor-pointer"
                  >
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-sans">
                      Adicionar
                    </span>
                  </button>
                </div>

                {uploadError && (
                  <p className="text-sm text-red-600 font-sans">
                    {uploadError}
                  </p>
                )}

                <p className="text-sm text-muted-foreground font-sans">
                  {`${selectedFiles.length} arquivo${selectedFiles.length > 1 ? "s" : ""} selecionado${selectedFiles.length > 1 ? "s" : ""}`}
                </p>
              </div>
            )}

            {/* Name input */}
            {selectedFiles.length > 0 && (
              <div className="mt-6 pt-4">
                <label className="block text-sm font-sans font-semibold text-foreground mb-2">
                  Seu nome (para identificar as fotos)
                </label>
                <input
                  type="text"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="Digite seu nome"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}

            {/* Upload button */}
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
                      Enviando...
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
