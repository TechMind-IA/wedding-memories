/**
 * Nome: hooks/use-reactions.ts
 * Função: Hook para reações de fotos.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface ReactionCount {
  emoji: string; count: number; reacted: boolean
}

export const REACTION_EMOJIS = ["❤️", "😍", "😂", "👏", "🔥"]

function getOrCreateSessionId(accessCode?: string): string {
  try {
    const key = accessCode ? `wedding_session_${accessCode}` : "wedding_session_id"
    let id = localStorage.getItem(key)
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
    return id
  } catch { return "anonymous" }
}

export function getSessionId(accessCode?: string): string {
  if (typeof window === "undefined") return "anonymous"
  return getOrCreateSessionId(accessCode)
}

export function useReactions(
  photoId: string,
  apiBase: string,
  options?: { initialReactions?: ReactionCount[]; skipInitialFetch?: boolean; accessCode?: string }
) {
  const [reactions, setReactions] = useState<ReactionCount[]>(options?.initialReactions ?? [])
  const [isLoading, setIsLoading] = useState(false)
  const sessionId = useRef<string>("")

  useEffect(() => { sessionId.current = getSessionId(options?.accessCode) }, [options?.accessCode])

  const fetchReactions = useCallback(async () => {
    if (!photoId || !sessionId.current || !apiBase) return
    try {
      const res = await fetch(`${apiBase}/reactions?photo_id=${photoId}&session_id=${sessionId.current}`)
      if (!res.ok) return
      const data = await res.json()
      setReactions(data.reactions ?? [])
    } catch { /* ignore */ }
  }, [photoId, apiBase])

  useEffect(() => {
    sessionId.current = getSessionId(options?.accessCode)
    if (options?.initialReactions) setReactions(options.initialReactions)
  }, [options?.initialReactions, options?.accessCode])

  useEffect(() => {
    sessionId.current = getSessionId(options?.accessCode)
    if (options?.skipInitialFetch) return
    fetchReactions()
  }, [fetchReactions, options?.skipInitialFetch, options?.accessCode])

  const toggleReaction = useCallback(async (emoji: string) => {
    if (!sessionId.current || !apiBase) return
    setReactions((prev) => {
      const currentReacted = prev.find((r) => r.reacted)
      if (currentReacted) {
        if (currentReacted.emoji === emoji) {
          const newCount = currentReacted.count - 1
          if (newCount <= 0) return prev.filter((r) => r.emoji !== emoji)
          return prev.map((r) => r.emoji === emoji ? { ...r, count: newCount, reacted: false } : r)
        } else {
          const updated = prev.map((r) => {
            if (r.emoji === currentReacted.emoji) { const c = r.count - 1; return c <= 0 ? null : { ...r, count: c, reacted: false } }
            if (r.emoji === emoji) return { ...r, count: r.count + 1, reacted: true }
            return r
          }).filter(Boolean) as ReactionCount[]
          return prev.some((r) => r.emoji === emoji) ? updated : [...updated, { emoji, count: 1, reacted: true }]
        }
      }
      const existing = prev.find((r) => r.emoji === emoji)
      if (existing) return prev.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r)
      return [...prev, { emoji, count: 1, reacted: true }]
    })
    setIsLoading(true)
    try {
      const res = await fetch(`${apiBase}/reactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo_id: photoId, emoji, session_id: sessionId.current }) })
      if (res.ok) { const data = await res.json(); setReactions(data.reactions ?? []) }
    } catch { fetchReactions() } finally { setIsLoading(false) }
  }, [photoId, apiBase, fetchReactions])

  const myReaction = reactions.find((r) => r.reacted)?.emoji ?? null
  return { reactions, toggleReaction, isLoading, myReaction, refetch: fetchReactions }
}

export function useReactionsBatch(photoIds: string[], apiBase: string, accessCode?: string) {
  const [reactionsMap, setReactionsMap] = useState<Record<string, ReactionCount[]>>({})
  const sessionId = useRef<string>("")

  useEffect(() => { sessionId.current = getSessionId(accessCode) }, [accessCode])

  useEffect(() => {
    sessionId.current = getSessionId(accessCode)
    if (photoIds.length === 0 || !sessionId.current || !apiBase) return
    fetch(`${apiBase}/reactions?photo_ids=${photoIds.join(",")}&session_id=${sessionId.current}`)
      .then((r) => r.json())
      .then((data) => setReactionsMap(data.reactions ?? {}))
      .catch(() => {})
  }, [photoIds.join(","), apiBase, accessCode]) // eslint-disable-line react-hooks/exhaustive-deps

  return { reactionsMap }
}
