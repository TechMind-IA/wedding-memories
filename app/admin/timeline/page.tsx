/**
 * Nome: app/admin/timeline/page.tsx
 * Função: CRUD completo da linha do tempo dos eventos.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, Pencil, Trash2, GripVertical, X, ChevronUp, ChevronDown, Check } from "lucide-react"
import type { TimelineEventDB } from "@/lib/timeline"

type TimelineEvent = TimelineEventDB

const EMOJI_OPTIONS = [
  "💍", "🏠", "👰", "🤵", "🎉", "📷", "💐", "🎂", "🥂", "🎵",
  "🌟", "💕", "🎊", "🎁", "🎶", "🌸", "☀️", "🌙", "💃", "🕺",
]

/** Converte datetime-local para ISO preservando offset local */
const toISOString = (localValue: string) => {
  if (!localValue) return ""
  const [datePart, timePart] = localValue.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hours, minutes] = (timePart || "00:00").split(":").map(Number)
  const d = new Date(year, month - 1, day, hours, minutes)
  return d.toISOString()
}

/** Converte ISO para datetime-local usando horário local */
const formatDateTimeLocal = (iso: string) => {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Form state
  const [formLabel, setFormLabel] = useState("")
  const [formEmoji, setFormEmoji] = useState("🎉")
  const [formStartDate, setFormStartDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    setToast({ type, message })
    toastTimeout.current = setTimeout(() => setToast(null), 3000)
  }

  const hasUnsavedData = formLabel || formStartDate || formEndDate

  const closeModal = useCallback(() => {
    if (hasUnsavedData && !window.confirm("Tem certeza que deseja fechar? As alterações não salvas serão perdidas.")) {
      return
    }
    setIsModalOpen(false)
    setFormError(null)
  }, [hasUnsavedData])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/timeline")
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch (error) {
      console.error("[Timeline] Erro ao buscar eventos:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Focus trap e autofocus no modal
  useEffect(() => {
    if (!isModalOpen) return

    const timer = setTimeout(() => {
      firstInputRef.current?.focus()
    }, 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal()
        return
      }
      if (e.key !== "Tab" || !modalRef.current) return

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isModalOpen, closeModal])

  const openCreateModal = () => {
    setEditingEvent(null)
    setFormLabel("")
    setFormEmoji("🎉")
    setFormStartDate("")
    setFormEndDate("")
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (event: TimelineEvent) => {
    setEditingEvent(event)
    setFormLabel(event.label)
    setFormEmoji(event.emoji)
    setFormStartDate(formatDateTimeLocal(event.start_date))
    setFormEndDate(formatDateTimeLocal(event.end_date))
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!formLabel || !formEmoji || !formStartDate || !formEndDate) return

    const start = new Date(toISOString(formStartDate))
    const end = new Date(toISOString(formEndDate))

    if (end <= start) {
      setFormError("A data/hora fim deve ser posterior à data/hora início")
      return
    }

    setIsSaving(true)
    try {
      const body = {
        label: formLabel,
        emoji: formEmoji,
        start_date: toISOString(formStartDate),
        end_date: toISOString(formEndDate),
      }

      let res: Response
      if (editingEvent) {
        res = await fetch(`/api/admin/timeline/${editingEvent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch("/api/admin/timeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error ?? "Erro ao salvar evento")
        return
      }

      setIsModalOpen(false)
      showToast("success", editingEvent ? "Evento atualizado!" : "Evento criado!")
      await fetchEvents()
    } catch (error) {
      console.error("[Timeline] Erro ao salvar:", error)
      setFormError("Falha ao conectar com o servidor")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(id)
    try {
      const res = await fetch(`/api/admin/timeline/${id}`, { method: "DELETE" })
      if (!res.ok) {
        showToast("error", "Erro ao excluir evento")
        return
      }
      setDeleteConfirm(null)
      showToast("success", "Evento excluído!")
      await fetchEvents()
    } catch (error) {
      console.error("[Timeline] Erro ao excluir:", error)
      showToast("error", "Falha ao excluir evento")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (isReordering) return
    const newEvents = [...events]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newEvents.length) return

    const temp = newEvents[index]
    newEvents[index] = newEvents[targetIndex]
    newEvents[targetIndex] = temp

    setEvents(newEvents)
    setIsReordering(true)

    const ids = newEvents.map((e) => e.id)
    try {
      const res = await fetch("/api/admin/timeline/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        await fetchEvents()
      }
    } catch (error) {
      console.error("[Timeline] Erro ao reordenar:", error)
      await fetchEvents()
    } finally {
      setIsReordering(false)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(iso.includes("T") ? { hour: "2-digit", minute: "2-digit" } : {}),
    })
  }

  // Escape para fechar modal
  useEffect(() => {
    if (!isModalOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isModalOpen])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-sans">Carregando eventos...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg transition-all ${
          toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>
          {toast.type === "success" && <Check className="h-4 w-4" />}
          <span className="font-sans text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-foreground">Timeline</h1>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Configure os eventos da linha do tempo do casamento
        </p>
      </div>

      {/* Lista de Eventos */}
      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="font-sans text-lg text-muted-foreground">Nenhum evento cadastrado</p>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            Clique no botão + para começar
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md sm:gap-4 sm:p-4"
            >
              {/* Drag Handle + Ordem */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <button
                  onClick={() => handleMove(index, "up")}
                  disabled={index === 0 || isReordering}
                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
                  aria-label="Mover para cima"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                <button
                  onClick={() => handleMove(index, "down")}
                  disabled={index === events.length - 1 || isReordering}
                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
                  aria-label="Mover para baixo"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              {/* Emoji */}
              <span className="text-2xl sm:text-3xl shrink-0">{event.emoji}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-sans text-sm font-semibold text-foreground truncate sm:text-base">
                  {event.label}
                </h3>
                <p className="font-sans text-xs text-muted-foreground truncate sm:text-sm">
                  {formatDate(event.start_date)} — {formatDate(event.end_date)}
                </p>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1.5 shrink-0 sm:gap-2">
                <button
                  onClick={() => openEditModal(event)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors sm:h-9 sm:w-9"
                  title="Editar"
                  aria-label="Editar evento"
                >
                  <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(event.id)}
                  disabled={isDeleting === event.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-red-500 hover:bg-red-50 transition-colors sm:h-9 sm:w-9 disabled:opacity-50"
                  title="Excluir"
                  aria-label="Excluir evento"
                >
                  {isDeleting === event.id ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>

              {/* Confirm Delete Inline */}
              {deleteConfirm === event.id && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <span className="font-sans text-xs text-red-600">Excluir?</span>
                  <button
                    onClick={() => handleDelete(event.id)}
                    disabled={isDeleting === event.id}
                    className="rounded bg-red-500 px-2 py-1 font-sans text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={isDeleting === event.id}
                    className="rounded border border-border px-2 py-1 font-sans text-xs font-semibold hover:bg-muted disabled:opacity-50"
                  >
                    Não
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criar/Editar */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/65 backdrop-blur-sm p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label={editingEvent ? "Editar evento" : "Novo evento"}
        >
          <div
            ref={modalRef}
            className="bg-background rounded-2xl shadow-[0_20px_48px_hsl(var(--foreground)/0.24)] border border-border w-full max-w-md p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-lg font-bold text-foreground">
                {editingEvent ? "Editar Evento" : "Novo Evento"}
              </h2>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Nome */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">
                  Nome do evento
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  placeholder="Ex: Cerimônia"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Emoji */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">
                  Emoji
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormEmoji(emoji)}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xl transition-all ${
                        formEmoji === emoji
                          ? "border-primary bg-primary/10 scale-110"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Início */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">
                  Data/hora início
                </label>
                <input
                  type="datetime-local"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Data Fim */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">
                  Data/hora fim
                </label>
                <input
                  type="datetime-local"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Erro de validação */}
              {formError && (
                <p className="font-sans text-sm text-red-500">{formError}</p>
              )}

              {/* Preview */}
              {formLabel && formStartDate && formEndDate && (
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="font-sans text-xs text-muted-foreground mb-1">Preview:</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{formEmoji}</span>
                    <span className="font-sans text-sm font-bold text-foreground">{formLabel}</span>
                    <span className="font-sans text-xs text-muted-foreground">
                      {formatDate(toISOString(formStartDate))} — {formatDate(toISOString(formEndDate))}
                    </span>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 font-sans text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formLabel || !formStartDate || !formEndDate}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Salvando..." : editingEvent ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAB — Adicionar evento */}
      <button
        onClick={openCreateModal}
        type="button"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_32px_hsl(var(--primary)/0.28)] transition-transform hover:scale-105 active:scale-95"
        aria-label="Novo evento"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  )
}
