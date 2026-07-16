/**
 * Nome: components/photo-reactions.tsx
 * Função: Renderiza a tela ou componente Photo Reactions da experiência de convidados.
 */

"use client"

import { useState } from "react"
import { useReactions, REACTION_EMOJIS, type ReactionCount } from "@/hooks/use-reactions"
import { cn } from "@/lib/utils"

interface PhotoReactionsProps {
  photoId: string
  apiBase: string
  variant?: "card" | "lightbox"
  initialReactions?: ReactionCount[]
}

export function PhotoReactions({
  photoId,
  apiBase,
  variant = "card",
  initialReactions,
}: PhotoReactionsProps) {
  const { reactions, toggleReaction, myReaction } = useReactions(photoId, apiBase, {
    initialReactions,
    skipInitialFetch: variant === "card" && !!initialReactions,
  })
  const [showPicker, setShowPicker] = useState(false)

  const sortedReactions = [...reactions].sort((a, b) => b.count - a.count)

  // ─── Variante CARD ───────────────────────────────────────────────────────
  if (variant === "card") {
    return (
      <div
        className="flex items-center justify-between gap-2 border-t border-border/45 bg-card/85 px-2.5 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reações existentes */}
        <div className="flex min-h-6 flex-1 flex-wrap gap-1">
          {sortedReactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => toggleReaction(r.emoji)}
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-sans transition-all",
                "border shadow-[0_4px_12px_hsl(var(--foreground)/0.05)]",
                r.reacted
                  ? "bg-primary/80 border-primary text-primary-foreground"
                  : "bg-background/75 border-border/50 text-foreground hover:bg-background"
              )}
            >
              <span className="text-sm leading-none">{r.emoji}</span>
              <span className="leading-none">{r.count}</span>
            </button>
          ))}
        </div>

        {/* Botão picker — só aparece se ainda não reagiu */}
        {!myReaction && (
          <div className="flex shrink-0 justify-end">
            <div className="relative">
              <button
                onClick={() => setShowPicker((v) => !v)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  "bg-background/75 border border-border/60 shadow-[0_4px_12px_hsl(var(--foreground)/0.06)]",
                  "hover:bg-background transition-all",
                  showPicker && "bg-background"
                )}
                aria-label="Reagir"
              >
                {showPicker ? "×" : "+"}
              </button>

              {showPicker && (
                <div className="absolute bottom-full right-0 z-20 mb-1 flex gap-1 rounded-full border border-border bg-background/95 px-2 py-1.5 shadow-[0_10px_24px_hsl(var(--foreground)/0.16)] backdrop-blur-sm">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        toggleReaction(emoji)
                        setShowPicker(false)
                      }}
                      className="text-lg transition-transform hover:scale-125 active:scale-95"
                      aria-label={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Variante LIGHTBOX ───────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col items-center gap-3 py-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-2">
        {REACTION_EMOJIS.map((emoji) => {
          const existing = sortedReactions.find((r) => r.emoji === emoji)
          const isMyChoice = myReaction === emoji
          const someoneElseChose = myReaction && myReaction !== emoji

          return (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-all",
                "border font-sans text-xs backdrop-blur-sm",
                isMyChoice
                  ? "bg-primary/90 border-primary text-primary-foreground scale-105"
                  : someoneElseChose
                  ? "bg-background/10 border-background/20 text-background/40 cursor-not-allowed"
                  : "bg-background/20 border-background/30 text-background hover:bg-background/30"
              )}
              aria-label={`Reagir com ${emoji}`}
              // Permite clicar no próprio emoji para desfazer, bloqueia os outros
              disabled={!!someoneElseChose}
            >
              <span className="text-xl leading-none">{emoji}</span>
              {existing && existing.count > 0 && (
                <span className="leading-none">{existing.count}</span>
              )}
            </button>
          )
        })}
      </div>

      {myReaction && (
        <p className="text-xs text-background/50 font-sans">
          Clique em {myReaction} para desfazer
        </p>
      )}
    </div>
  )
}
