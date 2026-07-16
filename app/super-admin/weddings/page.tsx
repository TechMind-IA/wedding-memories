/**
 * Nome: app/super-admin/weddings/page.tsx
 * Função: CRUD de casamentos pelo super-admin.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Copy, Check, ExternalLink, X, QrCode } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"

interface Wedding {
  id: string; accessCode: string; slug: string; coupleNames: string
  weddingDate: string | null; themeColor: string; isActive: boolean; createdAt: string
}

export default function WeddingsPage() {
  const [weddings, setWeddings] = useState<Wedding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWedding, setEditingWedding] = useState<Wedding | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [qrModalWedding, setQrModalWedding] = useState<Wedding | null>(null)
  const [siteUrl, setSiteUrl] = useState("")

  // Form
  const [formSlug, setFormSlug] = useState("")
  const [formNames, setFormNames] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formColor, setFormColor] = useState("#C2754F")
  const [formError, setFormError] = useState<string | null>(null)

  const fetchWeddings = useCallback(async () => {
    try { const res = await fetch("/api/super-admin/weddings"); const data = await res.json(); setWeddings(data.weddings ?? []) }
    catch { /* ignore */ } finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchWeddings(); fetch("/api/site-url").then(r => r.json()).then(d => setSiteUrl(d.url ?? "")).catch(() => {}) }, [fetchWeddings])

  const openCreateModal = () => { setEditingWedding(null); setFormSlug(""); setFormNames(""); setFormDate(""); setFormColor("#C2754F"); setFormError(null); setIsModalOpen(true) }
  const openEditModal = (w: Wedding) => { setEditingWedding(w); setFormSlug(w.slug); setFormNames(w.coupleNames); setFormDate(w.weddingDate ?? ""); setFormColor(w.themeColor); setFormError(null); setIsModalOpen(true) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null)
    if (!formSlug || !formNames) return
    setIsSaving(true)
    try {
      const url = editingWedding ? `/api/super-admin/weddings/${editingWedding.id}` : "/api/super-admin/weddings"
      const body = { slug: formSlug, coupleNames: formNames, weddingDate: formDate || undefined, themeColor: formColor }
      const res = await fetch(url, { method: editingWedding ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) { const data = await res.json(); setFormError(data.error ?? "Erro"); return }
      setIsModalOpen(false); await fetchWeddings()
    } catch { setFormError("Falha ao salvar") } finally { setIsSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/super-admin/weddings/${id}`, { method: "DELETE" }); setDeleteConfirm(null); await fetchWeddings() }
    catch { /* ignore */ }
  }

  const handleCopyLink = (wedding: Wedding) => {
    navigator.clipboard.writeText(`${siteUrl}/${wedding.accessCode}/${wedding.slug}`)
    setCopiedId(wedding.id); setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground">Carregando...</p></div>

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div><h1 className="font-sans text-2xl font-bold text-foreground">Casamentos</h1><p className="mt-1 font-sans text-sm text-muted-foreground">{weddings.length} casamento(s) cadastrado(s)</p></div>
        <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"><Plus className="h-4 w-4" /> Novo</button>
      </div>

      {weddings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center"><p className="font-sans text-lg text-muted-foreground">Nenhum casamento cadastrado</p></div>
      ) : (
        <div className="space-y-3">
          {weddings.map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: w.themeColor }} />
              <div className="flex-1 min-w-0">
                <h3 className="font-sans text-sm font-bold text-foreground truncate">{w.coupleNames}</h3>
                <p className="font-sans text-xs text-muted-foreground">/{w.accessCode}/{w.slug}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => handleCopyLink(w)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors" title="Copiar link">
                  {copiedId === w.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => setQrModalWedding(w)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors" title="QR Code"><QrCode className="h-3.5 w-3.5" /></button>
                <a href={`/${w.accessCode}/${w.slug}`} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors" title="Abrir"><ExternalLink className="h-3.5 w-3.5" /></a>
                <button onClick={() => openEditModal(w)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteConfirm(w.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-red-500 hover:bg-red-50 transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              {deleteConfirm === w.id && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <span className="font-sans text-xs text-red-600">Excluir?</span>
                  <button onClick={() => handleDelete(w.id)} className="rounded bg-red-500 px-2 py-1 font-sans text-xs font-semibold text-white hover:bg-red-600">Sim</button>
                  <button onClick={() => setDeleteConfirm(null)} className="rounded border border-border px-2 py-1 font-sans text-xs font-semibold hover:bg-muted">Não</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalWedding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/65 backdrop-blur-sm p-4" onClick={() => setQrModalWedding(null)}>
          <div className="bg-background rounded-2xl shadow-[0_20px_48px_hsl(var(--foreground)/0.24)] border border-border w-full max-w-sm p-6 flex flex-col gap-4 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full">
              <h2 className="font-sans text-lg font-bold text-foreground">QR Code</h2>
              <button onClick={() => setQrModalWedding(null)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <p className="font-sans text-sm text-muted-foreground text-center">{qrModalWedding.coupleNames}</p>
            <div className="rounded-xl bg-white p-4">
              <QRCodeCanvas value={`${siteUrl}/${qrModalWedding.accessCode}/${qrModalWedding.slug}`} size={180} bgColor="#ffffff" fgColor="#1a1a1a" level="M" />
            </div>
            <p className="font-sans text-xs text-muted-foreground text-center break-all">/{qrModalWedding.accessCode}/{qrModalWedding.slug}</p>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/65 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-background rounded-2xl shadow-[0_20px_48px_hsl(var(--foreground)/0.24)] border border-border w-full max-w-md p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-lg font-bold text-foreground">{editingWedding ? "Editar" : "Novo"} Casamento</h2>
              <button onClick={() => setIsModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">Slug (URL)</label>
                <input type="text" placeholder="meu-casamento" value={formSlug} onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} required className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">Nomes do casal</label>
                <input type="text" placeholder="Maria & João" value={formNames} onChange={(e) => setFormNames(e.target.value)} required className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">Data do casamento</label>
                <input type="text" placeholder="DD.MM.AA" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-sm font-medium text-foreground">Cor do tema</label>
                <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="h-10 w-20 rounded-lg border border-border cursor-pointer" />
              </div>
              {formError && <p className="font-sans text-sm text-red-500">{formError}</p>}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-lg border border-border px-4 py-2.5 font-sans text-sm font-semibold text-foreground hover:bg-muted transition-colors">Cancelar</button>
                <button type="submit" disabled={isSaving || !formSlug || !formNames} className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">{isSaving ? "Salvando..." : editingWedding ? "Salvar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
