/**
 * Nome: app/admin/settings/page.tsx
 * Função: Configurações — alterar senhas do admin e de moderação.
 */

"use client"

import { useState, useRef, useEffect } from "react"
import { Lock, Eye, EyeOff } from "lucide-react"

export default function SettingsPage() {
  const [adminCurrent, setAdminCurrent] = useState("")
  const [adminNew, setAdminNew] = useState("")
  const [adminConfirm, setAdminConfirm] = useState("")
  const [modCurrent, setModCurrent] = useState("")
  const [modNew, setModNew] = useState("")
  const [modConfirm, setModConfirm] = useState("")

  const [showAdminCurrent, setShowAdminCurrent] = useState(false)
  const [showAdminNew, setShowAdminNew] = useState(false)
  const [showAdminConfirm, setShowAdminConfirm] = useState(false)
  const [showModCurrent, setShowModCurrent] = useState(false)
  const [showModNew, setShowModNew] = useState(false)
  const [showModConfirm, setShowModConfirm] = useState(false)

  const [adminLoading, setAdminLoading] = useState(false)
  const [modLoading, setModLoading] = useState(false)
  const [adminMessage, setAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [modMessage, setModMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const adminTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (adminTimeout.current) clearTimeout(adminTimeout.current)
      if (modTimeout.current) clearTimeout(modTimeout.current)
    }
  }, [])

  const handleAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminLoading(true)
    setAdminMessage(null)

    if (adminNew !== adminConfirm) {
      setAdminMessage({ type: "error", text: "As senhas não conferem" })
      setAdminLoading(false)
      return
    }

    try {
      const res = await fetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "admin",
          currentPassword: adminCurrent,
          newPassword: adminNew,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setAdminMessage({ type: "error", text: data.error ?? "Erro ao alterar senha" })
      } else {
        setAdminMessage({ type: "success", text: "Senha do admin alterada com sucesso!" })
        setAdminCurrent("")
        setAdminNew("")
        setAdminConfirm("")
        if (adminTimeout.current) clearTimeout(adminTimeout.current)
        adminTimeout.current = setTimeout(() => setAdminMessage(null), 3000)
      }
    } catch {
      setAdminMessage({ type: "error", text: "Falha ao conectar com o servidor" })
    } finally {
      setAdminLoading(false)
    }
  }

  const handleModPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setModLoading(true)
    setModMessage(null)

    if (modNew !== modConfirm) {
      setModMessage({ type: "error", text: "As senhas não conferem" })
      setModLoading(false)
      return
    }

    try {
      const res = await fetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "moderation",
          currentPassword: modCurrent,
          newPassword: modNew,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setModMessage({ type: "error", text: data.error ?? "Erro ao alterar senha" })
      } else {
        setModMessage({ type: "success", text: "Senha de moderação alterada com sucesso!" })
        setModCurrent("")
        setModNew("")
        setModConfirm("")
        if (modTimeout.current) clearTimeout(modTimeout.current)
        modTimeout.current = setTimeout(() => setModMessage(null), 3000)
      }
    } catch {
      setModMessage({ type: "error", text: "Falha ao conectar com o servidor" })
    } finally {
      setModLoading(false)
    }
  }

  const PasswordInput = ({
    value,
    onChange,
    placeholder,
    show,
    onToggle,
  }: {
    value: string
    onChange: (v: string) => void
    placeholder: string
    show: boolean
    onToggle: () => void
  }) => (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-foreground">Configurações</h1>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Gerencie as senhas do painel e de moderação
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Senha do Admin */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-sans text-lg font-bold text-foreground">Senha do Admin</h2>
              <p className="font-sans text-xs text-muted-foreground">Acesso ao painel administrativo</p>
            </div>
          </div>

          <form onSubmit={handleAdminPassword} className="flex flex-col gap-3">
            <PasswordInput
              value={adminCurrent}
              onChange={setAdminCurrent}
              placeholder="Senha atual"
              show={showAdminCurrent}
              onToggle={() => setShowAdminCurrent(!showAdminCurrent)}
            />
            <PasswordInput
              value={adminNew}
              onChange={setAdminNew}
              placeholder="Nova senha"
              show={showAdminNew}
              onToggle={() => setShowAdminNew(!showAdminNew)}
            />
            <PasswordInput
              value={adminConfirm}
              onChange={setAdminConfirm}
              placeholder="Confirmar nova senha"
              show={showAdminConfirm}
              onToggle={() => setShowAdminConfirm(!showAdminConfirm)}
            />
            <button
              type="submit"
              disabled={adminLoading || !adminCurrent || !adminNew || !adminConfirm}
              className="rounded-lg bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adminLoading ? "Alterando..." : "Alterar senha do admin"}
            </button>
          </form>

          {adminMessage && (
            <p className={`mt-3 font-sans text-sm ${adminMessage.type === "success" ? "text-green-500" : "text-red-500"}`}>
              {adminMessage.text}
            </p>
          )}
        </div>

        {/* Senha de Moderação */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Lock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-sans text-lg font-bold text-foreground">Senha de Moderação</h2>
              <p className="font-sans text-xs text-muted-foreground">Usada para excluir fotos na galeria</p>
            </div>
          </div>

          <form onSubmit={handleModPassword} className="flex flex-col gap-3">
            <PasswordInput
              value={modCurrent}
              onChange={setModCurrent}
              placeholder="Senha atual"
              show={showModCurrent}
              onToggle={() => setShowModCurrent(!showModCurrent)}
            />
            <PasswordInput
              value={modNew}
              onChange={setModNew}
              placeholder="Nova senha"
              show={showModNew}
              onToggle={() => setShowModNew(!showModNew)}
            />
            <PasswordInput
              value={modConfirm}
              onChange={setModConfirm}
              placeholder="Confirmar nova senha"
              show={showModConfirm}
              onToggle={() => setShowModConfirm(!showModConfirm)}
            />
            <button
              type="submit"
              disabled={modLoading || !modCurrent || !modNew || !modConfirm}
              className="rounded-lg bg-amber-500 px-4 py-2.5 font-sans text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {modLoading ? "Alterando..." : "Alterar senha de moderação"}
            </button>
          </form>

          {modMessage && (
            <p className={`mt-3 font-sans text-sm ${modMessage.type === "success" ? "text-green-500" : "text-red-500"}`}>
              {modMessage.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
