/**
 * Nome: app/admin/dashboard/page.tsx
 * Função: Dashboard do painel admin com métricas.
 */

"use client"

import { useState, useEffect } from "react"
import { Camera, Video, Film, HardDrive } from "lucide-react"

interface DashboardData {
  photosCount: number
  videosCount: number
  totalMemories: number
  storageUsedGB: string
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [photosRes, videosRes] = await Promise.all([
          fetch("/api/admin/photos/count"),
          fetch("/api/admin/photos/count-videos"),
        ])

        if (!photosRes.ok || !videosRes.ok) {
          throw new Error("Falha ao carregar métricas")
        }

        const photosData = await photosRes.json()
        const videosData = await videosRes.json()

        const photosCount = photosData.count ?? 0
        const videosCount = videosData.videosCount ?? 0

        setData({
          photosCount,
          videosCount,
          totalMemories: photosCount + videosCount,
          storageUsedGB: videosData.storageUsedGB ?? "0",
        })
      } catch (error) {
        console.error("[Dashboard] Erro:", error)
        setError("Falha ao carregar métricas. Tente novamente.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-sans">Carregando métricas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-500 font-sans">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const cards = [
    {
      label: "Fotos",
      value: data?.photosCount ?? 0,
      icon: Camera,
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      textColor: "text-white",
      subColor: "text-blue-100",
    },
    {
      label: "Vídeos",
      value: data?.videosCount ?? 0,
      icon: Video,
      gradient: "from-purple-500 to-purple-600",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      textColor: "text-white",
      subColor: "text-purple-100",
    },
    {
      label: "Total de Memórias",
      value: data?.totalMemories ?? 0,
      icon: Film,
      gradient: "from-primary to-amber-700",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      textColor: "text-white",
      subColor: "text-amber-100",
    },
    {
      label: "Armazenamento",
      value: `${data?.storageUsedGB ?? "0"} GB`,
      icon: HardDrive,
      gradient: "from-emerald-500 to-emerald-600",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      textColor: "text-white",
      subColor: "text-emerald-100",
      isText: true,
    },
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Visão geral da galeria de memórias
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-6 shadow-lg transition-transform hover:scale-[1.02] hover:shadow-xl`}
          >
            {/* Ícone decorativo de fundo */}
            <div className="absolute -right-6 -bottom-6 opacity-10">
              <card.icon className="h-32 w-32" />
            </div>

            {/* Conteúdo */}
            <div className="relative z-10 flex flex-col items-start gap-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg}`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <div>
                <p className={`font-sans text-sm font-medium ${card.subColor}`}>
                  {card.label}
                </p>
                <p className={`mt-2 font-sans text-5xl font-bold tracking-tight tabular-nums ${card.textColor}`}>
                  {card.isText ? card.value : Number(card.value).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
