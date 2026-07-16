/**
 * Nome: app/[accessCode]/[slug]/admin/timeline/page.tsx
 * Função: CRUD da timeline do casamento.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, Pencil, Trash2, GripVertical, X, ChevronUp, ChevronDown, Check } from "lucide-react"
import { useWedding } from "@/components/wedding-provider"

interface TimelineEvent { id: string; label: string; emoji: string; start_date: string; end_date: string; sort_order: number }

const EMOJI_OPTIONS = ["💍", "🏠", "👰", "🤵", "🎉", "📷", "💐", "🎂", "🥂", "🎵", "🌟", "💕", "🎊", "🎁", "🎶", "🌸", "☀️", "🌙", "💃", "🕺"]

const toISOString = (localValue: string) => {
  if (!localValue) return ""
  const [datePart, timePart] = localValue.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hours, minutes] = (timePart || "00:00").split(":").map(Number)
  return new Date(year, month - 1, day, hours, minutes).toISOString()
}

const formatDateTimeLocal = (iso: string) => {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export default function TimelinePage() {
  const { accessCode, slug } = useWedding()
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [formLabel, setFormLabel] = useState("")
  const [formEmoji, setFormEmoji] = useState("🎉")
  const [formStartDate, setFormStartDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const apiBase = `/api/${accessCode}/${slug}`

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    setToast({ type, message })
    toastTimeout.current = setTimeout(() => setToast(null), 3000)
  }

  const fetchEvents = useCallback(async () => {
    try { const res = await fetch(`${apiBase}/admin/timeline`); const data = await res.json(); setEvents(data.events ?? []) }
    catch { /* ignore */ } finally { setIsLoading(false) }
  }, [apiBase])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const openCreateModal = () => { setEditingEvent(null); setFormLabel(""); setFormEmoji("🎉"); setFormStartDate(""); setFormEndDate(""); setFormError(null); setIsModalOpen(true) }
  const openEditModal = (event: TimelineEvent) => { setEditingEvent(event); setFormLabel(event.label); setFormEmoji(event.emoji); setFormStartDate(formatDateTimeLocal(event.start_date)); setFormEndDate(formatDateTimeLocal(event.end_date)); setFormError(null); setIsModalOpen(true) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!formLabel || !formEmoji || !formStartDate || !formEndDate) return
    if (new Date(toISOString(formEndDate)) <= new Date(toISOString(formStartDate))) { setFormError("Fim deve ser posterior ao início"); return }
    setIsSaving(true)
    try {
      const body = { label: formLabel, emoji: formEmoji, start_date: toISOString(formStartDate), end_date: toISOString(formEndDate) }
      const url = editingEvent ? `${apiBase}/admin/timeline/${editingEvent.id}` : `${apiBase}/admin/timeline`
      const res = await fetch(url, { method: editingEvent ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) { const data = await res.json(); setFormError(data.error ?? "Erro"); return }
      setIsModalOpen(false); showToast("success", editingEvent ? "Atualizado!" : "Criado!"); await fetchEvents()
    } catch { setFormError("Falha ao conectar") } finally { setIsSaving(false) }
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(id)
    try {
      const res = await fetch(`${apiBase}/admin/timeline/${id}`, { method: "DELETE" })
      if (!res.ok) { showToast("error", "Erro ao excluir"); return }
      setDeleteConfirm(null); showToast("success", "Excluído!"); await fetchEvents()
    } catch { showToast("error", "Falha ao excluir") } finally { setIsDeleting(null) }
  }

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (isReordering) return
    const newEvents = [...events]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newEvents.length) return
    ;[newEvents[index], newEvents[targetIndex]] = [newEvents[targetIndex], newEvents[index]]
    setEvents(newEvents); setIsReordering(true)
    try { await fetch(`${apiBase}/admin/timeline/reorder`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: newEvents.map((e) => e.id) }) }) }
    catch { await fetchEvents() } finally { setIsReordering(false) }
  }

  const formatDate = (iso: string) => { const d = new Date(iso); if (isNaN(d.getTime())) return iso; return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", ...(iso.includes("T") ? { hour: "2-digit", minute: "2-digit" } : {}) }) }

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground font-sans">Carregando eventos...</p></div>

  return (
    <div className="p-6 md:p-8">
      {toast && <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg transition-all ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>{toast.type === "success" && <Check className="h-4 w-4" />}<span className="font-sans text-sm font-medium">{toast.message}</span></div>}

      <div className="mb-8"><h1 className="font-sans text-2xl font-bold text-foreground">Timeline</h1><p className="mt-1 font-sans text-sm text-muted-foreground">Configure os eventos da linha do tempo</p></div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center"><p className="font-sans text-lg text-muted-foreground">Nenhum evento cadastrado</p></div>
      ) : (
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={event.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md sm:gap-4 sm:p-4">
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <button onClick={() => handleMove(index, "up")} disabled={index === 0 || isReordering} className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                <button onClick={() => handleMove(index, "down")} disabled={index === events.length - 1 || isReordering} className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
              </div>
              <span className="text-2xl sm:text-3xl shrink-0">{event.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-sans text-sm font-semibold text-foreground truncate sm:text-base">{event.label}</h3>
                <p className="font-sans text-xs text-muted-foreground truncate sm:text-sm">{formatDate(event.start_date)} — {formatDate(event.end_date)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 sm:gap-2">
                <button onClick={() => openEditModal(event)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"><Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                <button onClick={() => setDeleteConfirm(event.id)} disabled={isDeleting === event.id} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                  {isDeleting === event.id ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" /> : <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                </button>
              </div>
              {deleteConfirm === event.id && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <span className="font-sans text-xs text-red-600">Excluir?</span>
                  <button onClick={() => handleDelete(event.id)} className="rounded bg-red-500 px-2 py-1 font-sans text-xs font-semibold text-white hover:bg-red-600">Sim</button>
                  <button onClick={() => setDeleteConfirm(null)} className="rounded border border-border px-2 py-1 font-sans text-xs font-semibold hover:bg-muted">Não</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/65 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-background rounded-2xl shadow-[0_20px_48px_hsl(var(--foreground)/0.24)] border border-border w-full max-w-md p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-lg font-bold text-foreground">{editingEvent ? "Editar" : "Novo"} Evento</h2>
              <button onClick={() => setIsModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">Nome</label>
                <input type="text" placeholder="Ex: Cerimônia" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} required className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => setFormEmoji(emoji)} className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xl transition-all ${formEmoji === emoji ? "border-primary bg-primary/10 scale-110" : "border-border hover:bg-muted"}`}>{emoji}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">Início</label>
                <input type="datetime-local" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} required className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">Fim</label>
                <input type="datetime-local" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} required className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              {formError && <p className="font-sans text-sm text-red-500">{formError}</p>}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-lg border border-border px-4 py-2.5 font-sans text-sm font-semibold text-foreground hover:bg-muted transition-colors">Cancelar</button>
                <button type="submit" disabled={isSaving || !formLabel || !formStartDate || !formEndDate} className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">{isSaving ? "Salvando..." : editingEvent ? "Salvar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button onClick={openCreateModal} className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_32px_hsl(var(--primary)/0.28)] transition-transform hover:scale-105 active:scale-95"><Plus className="h-7 w-7" /></button>
    </div>
  )
}
