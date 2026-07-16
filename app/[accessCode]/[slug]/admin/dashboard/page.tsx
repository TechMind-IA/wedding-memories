/**
 * Nome: app/[accessCode]/[slug]/admin/dashboard/page.tsx
 * Função: Dashboard do admin com métricas do casamento.
 */

"use client"

import { useState, useEffect } from "react"
import { Camera, Video, Film, HardDrive } from "lucide-react"
import { useWedding } from "@/components/wedding-provider"

interface DashboardData {
  photosCount: number; videosCount: number; totalMemories: number; storageUsedGB: string
}

export default function DashboardPage() {
  const { accessCode, slug } = useWedding()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const apiBase = `/api/${accessCode}/${slug}`

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [photosRes, videosRes] = await Promise.all([
          fetch(`${apiBase}/admin/photos/count`),
          fetch(`${apiBase}/admin/photos/count-videos`),
        ])
        if (!photosRes.ok || !videosRes.ok) throw new Error("Falha")
        const photosData = await photosRes.json()
        const videosData = await videosRes.json()
        setData({
          photosCount: photosData.count ?? 0,
          videosCount: videosData.videosCount ?? 0,
          totalMemories: (photosData.count ?? 0) + (videosData.videosCount ?? 0),
          storageUsedGB: videosData.storageUsedGB ?? "0",
        })
      } catch { /* ignore */ } finally { setIsLoading(false) }
    }
    fetchDashboard()
  }, [apiBase])

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground font-sans">Carregando métricas...</p></div>

  const cards = [
    { label: "Fotos", value: data?.photosCount ?? 0, icon: Camera, gradient: "from-blue-500 to-blue-600", iconBg: "bg-white/20", textColor: "text-white", subColor: "text-blue-100" },
    { label: "Vídeos", value: data?.videosCount ?? 0, icon: Video, gradient: "from-purple-500 to-purple-600", iconBg: "bg-white/20", textColor: "text-white", subColor: "text-purple-100" },
    { label: "Total de Memórias", value: data?.totalMemories ?? 0, icon: Film, gradient: "from-primary to-amber-700", iconBg: "bg-white/20", textColor: "text-white", subColor: "text-amber-100" },
    { label: "Armazenamento", value: `${data?.storageUsedGB ?? "0"} GB`, icon: HardDrive, gradient: "from-emerald-500 to-emerald-600", iconBg: "bg-white/20", textColor: "text-white", subColor: "text-emerald-100", isText: true },
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 font-sans text-sm text-muted-foreground">Visão geral da galeria de memórias</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-6 shadow-lg transition-transform hover:scale-[1.02] hover:shadow-xl`}>
            <div className="absolute -right-6 -bottom-6 opacity-10"><card.icon className="h-32 w-32" /></div>
            <div className="relative z-10 flex flex-col items-start gap-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg}`}><card.icon className="h-6 w-6 text-white" /></div>
              <div>
                <p className={`font-sans text-sm font-medium ${card.subColor}`}>{card.label}</p>
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
