/**
 * Nome: app/[accessCode]/[slug]/admin/page.tsx
 * Função: Tela de login do admin daquele casamento.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Lock, ArrowLeft } from "lucide-react"
import { useWedding } from "@/components/wedding-provider"

export default function AdminLoginPage() {
  const { accessCode, slug, coupleNames } = useWedding()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const basePath = `/${accessCode}/${slug}`

  useEffect(() => {
    fetch(`${basePath}/api/${accessCode}/${slug}/admin/auth/check`)
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) router.replace(`${basePath}/admin/dashboard`)
        else setIsChecking(false)
      })
      .catch(() => setIsChecking(false))
  }, [basePath, accessCode, slug, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${basePath}/api/${accessCode}/${slug}/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Erro ao autenticar"); setIsLoading(false); return }
      router.replace(`${basePath}/admin/dashboard`)
    } catch { setError("Falha ao conectar com o servidor"); setIsLoading(false) }
  }

  if (isChecking) return <div className="flex min-h-[100dvh] items-center justify-center bg-background"><p className="text-muted-foreground font-sans">Verificando...</p></div>

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4">
      <Link href={basePath} className="fixed top-5 left-5 z-20 inline-flex items-center gap-2 font-sans text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar ao site
      </Link>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="mt-1 font-sans text-sm text-muted-foreground">{coupleNames}</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="font-sans text-sm font-medium text-foreground">Senha</label>
            <input id="password" type="password" placeholder="Digite a senha do painel" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} autoFocus
              className="w-full rounded-lg border border-border bg-background px-4 py-3 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50" />
          </div>
          {error && <p className="font-sans text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={isLoading || !password.trim()}
            className="w-full rounded-lg bg-primary px-4 py-3 font-sans text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/0.2)] transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Entrando...</span> : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}
