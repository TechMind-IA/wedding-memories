/**
 * Nome: app/super-admin/layout.tsx
 * Função: Layout do super-admin.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Shield, LogOut, Menu, X, ListChecks } from "lucide-react"

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === "/super-admin") { setIsAuthenticated(true); return }
    fetch("/api/super-admin/auth/check")
      .then((r) => r.json())
      .then((data) => { if (!data.authenticated) router.replace("/super-admin"); else setIsAuthenticated(true) })
      .catch(() => router.replace("/super-admin"))
  }, [pathname, router])

  const handleLogout = async () => {
    await fetch("/api/super-admin/auth/logout", { method: "POST" })
    router.replace("/super-admin")
  }

  if (pathname === "/super-admin") return <>{children}</>
  if (isAuthenticated === null) return <div className="flex min-h-[100dvh] items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
        <div className="flex h-16 items-center px-6 border-b border-border">
          <Shield className="h-5 w-5 text-primary mr-2" />
          <span className="font-serif text-lg font-bold text-foreground">Super Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link href="/super-admin/weddings" className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium transition-colors ${pathname === "/super-admin/weddings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <ListChecks className="h-5 w-5" /> Casamentos
          </Link>
        </nav>
        <div className="border-t border-border p-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <LogOut className="h-5 w-5" /> Sair
          </button>
        </div>
      </aside>

      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-border bg-card px-4 md:hidden">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted">
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="ml-3 font-serif text-lg font-bold text-foreground">Super Admin</span>
      </div>

      {isMobileMenuOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform duration-200 md:hidden ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 items-center px-6 border-b border-border"><span className="font-serif text-lg font-bold text-foreground">Super Admin</span></div>
        <nav className="px-3 py-4 space-y-1">
          <Link href="/super-admin/weddings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <ListChecks className="h-5 w-5" /> Casamentos
          </Link>
        </nav>
      </aside>

      <main className="flex-1 md:ml-64"><div className="pt-14 md:pt-0">{children}</div></main>
    </div>
  )
}
