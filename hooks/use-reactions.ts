/**
 * Nome: hooks/use-reactions.ts
 * Função: Expõe o hook use reactions para encapsular estado e efeitos reutilizáveis.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface ReactionCount {
  emoji: string
  count: number
  reacted: boolean // true se o session_id atual reagiu com este emoji
}

export const REACTION_EMOJIS = ["❤️", "😍", "😂", "👏", "🔥"]

// ─────────────────────────────────────────────────────────────────────────────
// Session ID — identifica o visitante sem login via localStorage
// ─────────────────────────────────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem("wedding_session_id")
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem("wedding_session_id", id)
    }
    return id
  } catch {
    return "anonymous"
  }
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "anonymous"
  return getOrCreateSessionId()
}

// ─────────────────────────────────────────────────────────────────────────────
// useReactions — reações de uma única foto
// ─────────────────────────────────────────────────────────────────────────────

export function useReactions(
  photoId: string,
  options?: { initialReactions?: ReactionCount[]; skipInitialFetch?: boolean }
) {
  const [reactions, setReactions] = useState<ReactionCount[]>(options?.initialReactions ?? [])
  const [isLoading, setIsLoading] = useState(false)
  const sessionId = useRef<string>("")

  useEffect(() => {
    sessionId.current = getSessionId()
  }, [])

  const fetchReactions = useCallback(async () => {
    if (!photoId || !sessionId.current) return
    try {
      const res = await fetch(
        `/api/reactions?photo_id=${photoId}&session_id=${sessionId.current}`
      )
      if (!res.ok) return
      const data = await res.json()
      setReactions(data.reactions ?? [])
    } catch (error) {
      console.error("[useReactions] Erro ao buscar:", error)
    }
  }, [photoId])

  useEffect(() => {
    sessionId.current = getSessionId()
    if (options?.initialReactions) {
      setReactions(options.initialReactions)
    }
  }, [options?.initialReactions])

  useEffect(() => {
    sessionId.current = getSessionId()
    if (options?.skipInitialFetch) return
    fetchReactions()
  }, [fetchReactions, options?.skipInitialFetch])

  /**
   * Toggle com lógica de 1 reação por foto:
   * - Mesmo emoji → remove (toggle off)
   * - Emoji diferente → troca
   * - Sem reação prévia → adiciona
   *
   * Aplica atualização otimista imediata e sincroniza com o servidor em seguida.
   */
  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!sessionId.current) return

      // Atualização otimista
      setReactions((prev) => {
        const currentReacted = prev.find((r) => r.reacted)

        if (currentReacted) {
          if (currentReacted.emoji === emoji) {
            // Mesmo emoji → remove
            const newCount = currentReacted.count - 1
            if (newCount <= 0) return prev.filter((r) => r.emoji !== emoji)
            return prev.map((r) =>
              r.emoji === emoji ? { ...r, count: newCount, reacted: false } : r
            )
          } else {
            // Emoji diferente → desfaz anterior e aplica novo
            const updated = prev
              .map((r) => {
                if (r.emoji === currentReacted.emoji) {
                  const newCount = r.count - 1
                  return newCount <= 0 ? null : { ...r, count: newCount, reacted: false }
                }
                if (r.emoji === emoji) {
                  return { ...r, count: r.count + 1, reacted: true }
                }
                return r
              })
              .filter(Boolean) as ReactionCount[]

            // Adiciona o novo emoji se ainda não existia na lista
            const alreadyInList = prev.some((r) => r.emoji === emoji)
            return alreadyInList ? updated : [...updated, { emoji, count: 1, reacted: true }]
          }
        }

        // Sem reação anterior → adiciona
        const existing = prev.find((r) => r.emoji === emoji)
        if (existing) {
          return prev.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r
          )
        }
        return [...prev, { emoji, count: 1, reacted: true }]
      })

      // Sincroniza com o servidor
      setIsLoading(true)
      try {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photo_id: photoId,
            emoji,
            session_id: sessionId.current,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setReactions(data.reactions ?? [])
        }
      } catch (error) {
        console.error("[useReactions] Erro ao reagir:", error)
        fetchReactions() // reverte para o estado real do servidor
      } finally {
        setIsLoading(false)
      }
    },
    [photoId, fetchReactions]
  )

  // Emoji escolhido pelo visitante nesta foto (null se não reagiu)
  const myReaction = reactions.find((r) => r.reacted)?.emoji ?? null

  return { reactions, toggleReaction, isLoading, myReaction, refetch: fetchReactions }
}

// ─────────────────────────────────────────────────────────────────────────────
// useReactionsBatch — reações de múltiplas fotos de uma vez (galeria inteira)
// ─────────────────────────────────────────────────────────────────────────────

export function useReactionsBatch(photoIds: string[]) {
  const [reactionsMap, setReactionsMap] = useState<Record<string, ReactionCount[]>>({})
  const sessionId = useRef<string>("")

  useEffect(() => {
    sessionId.current = getSessionId()
  }, [])

  useEffect(() => {
    sessionId.current = getSessionId()
    if (photoIds.length === 0 || !sessionId.current) return

    const fetchBatch = async () => {
      try {
        const ids = photoIds.join(",")
        const res = await fetch(
          `/api/reactions?photo_ids=${ids}&session_id=${sessionId.current}`
        )
        if (!res.ok) return
        const data = await res.json()
        setReactionsMap(data.reactions ?? {})
      } catch (error) {
        console.error("[useReactionsBatch] Erro:", error)
      }
    }

    fetchBatch()
  }, [photoIds.join(",")]) // eslint-disable-line react-hooks/exhaustive-deps

  return { reactionsMap }
}
