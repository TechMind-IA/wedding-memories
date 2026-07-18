/**
 * Nome: app/[accessCode]/[slug]/admin/layout.tsx
 * Função: Layout do painel admin do casamento com sidebar.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Image, Clock, Settings, LogOut, Menu, X, Palette, FileText } from "lucide-react"
import { useWedding } from "@/components/wedding-provider"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { accessCode, slug, coupleNames } = useWedding()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const basePath = `/${accessCode}/${slug}`

  const NAV_ITEMS = [
    { href: `${basePath}/admin/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `${basePath}/admin/gallery`, label: "Galeria", icon: Image },
    { href: `${basePath}/admin/timeline`, label: "Timeline", icon: Clock },
    { href: `${basePath}/admin/customize`, label: "Personalização", icon: Palette },
    { href: `${basePath}/admin/texts`, label: "Textos", icon: FileText },
    { href: `${basePath}/admin/settings`, label: "Configurações", icon: Settings },
  ]

  useEffect(() => {
    if (pathname === `${basePath}/admin`) {
      setIsAuthenticated(true)
      return
    }
    fetch(`/api/${accessCode}/${slug}/admin/auth/check`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) router.replace(`${basePath}/admin`)
        else setIsAuthenticated(true)
      })
      .catch(() => router.replace(`${basePath}/admin`))
  }, [pathname, basePath, accessCode, slug, router])

  const handleLogout = async () => {
    await fetch(`/api/${accessCode}/${slug}/admin/auth/logout`, { method: "POST" })
    router.replace(`${basePath}/admin`)
  }

  if (pathname === `${basePath}/admin`) return <>{children}</>

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-muted-foreground font-sans">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
        <div className="flex h-16 items-center px-6 border-b border-border">
          <Link href={`${basePath}/admin/dashboard`} className="font-serif text-lg font-bold text-foreground truncate">
            {coupleNames}
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-border p-3 space-y-1">
          <a href={`${basePath}`} target="_blank" rel="noopener noreferrer"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <span className="text-sm">🔗</span> Ver galeria
          </a>
          <button onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <LogOut className="h-5 w-5" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-border bg-card px-4 md:hidden">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted" aria-label="Menu">
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="ml-3 font-serif text-lg font-bold text-foreground truncate">{coupleNames}</span>
      </div>

      {isMobileMenuOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform duration-200 md:hidden ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 items-center px-6 border-b border-border">
          <span className="font-serif text-lg font-bold text-foreground truncate">{coupleNames}</span>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <item.icon className="h-5 w-5" /> {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 inset-x-0 border-t border-border p-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <LogOut className="h-5 w-5" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64">
        <div className="pt-14 md:pt-0">{children}</div>
      </main>
    </div>
  )
}
