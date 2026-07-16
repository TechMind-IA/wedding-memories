/**
 * Nome: lib/timeline.ts
 * Função: Concentra utilitários de Timeline usados pela aplicação.
 * Multi-tenant: recebe weddingId nas funções que buscam do banco.
 */

export interface TimelineEventDB {
  id: string
  wedding_id: string
  label: string
  emoji: string
  start_date: string
  end_date: string
  sort_order: number
}

export interface TimelineEvent {
  id: string
  label: string
  emoji: string
  start: string
  end: string
}

/**
 * Fallback: eventos hardcoded caso o banco esteja vazio.
 */
export const TIMELINE_EVENTS_FALLBACK: TimelineEvent[] = []

/**
 * Converte eventos do formato DB para o formato da timeline.
 */
export function dbEventsToTimelineEvents(dbEvents: TimelineEventDB[]): TimelineEvent[] {
  return dbEvents.map((evt) => ({
    id: evt.id,
    label: evt.label,
    emoji: evt.emoji,
    start: evt.start_date,
    end: evt.end_date,
  }))
}

/**
 * Busca eventos da timeline do casamento.
 * Tenta buscar do banco; se falhar, retorna vazio.
 */
export async function getTimelineEvents(weddingId: string): Promise<TimelineEvent[]> {
  try {
    const { getTimelineEventsFromDB } = await import("@/lib/db")
    const dbEvents = await getTimelineEventsFromDB(weddingId)
    if (dbEvents.length > 0) {
      return dbEventsToTimelineEvents(dbEvents)
    }
  } catch (error) {
    console.warn("[timeline] Erro ao buscar do banco:", error)
  }
  return TIMELINE_EVENTS_FALLBACK
}

/**
 * Retorna o evento da timeline ao qual uma foto pertence,
 * com base no `date_taken`. Se não houver data ou não encaixar
 * em nenhum evento, retorna `null`.
 */
export function getEventForDate(
  dateTaken: string | null | undefined,
  events: TimelineEvent[] = TIMELINE_EVENTS_FALLBACK
): TimelineEvent | null {
  if (!dateTaken) return null

  const photoDate = new Date(dateTaken)
  if (isNaN(photoDate.getTime())) return null

  for (const event of events) {
    const startDate = parseEventDate(event.start, "start")
    const endDate = parseEventDate(event.end, "end")

    if (photoDate >= startDate && photoDate <= endDate) {
      return event
    }
  }

  return null
}

function parseEventDate(dateStr: string, type: "start" | "end"): Date {
  if (dateStr.includes("T")) {
    return new Date(dateStr)
  }
  const [year, month, day] = dateStr.split("-").map(Number)
  if (type === "start") {
    return new Date(year, month - 1, day, 0, 0, 0)
  } else {
    return new Date(year, month - 1, day, 23, 59, 59)
  }
}

export interface PhotoGroup {
  event: TimelineEvent
  photoIds: string[]
}

/**
 * Agrupa fotos pelos eventos da timeline.
 */
export function groupPhotosByTimeline<T extends {
  id: string
  created_at?: string | null
  date_taken?: string | null
}>(
  photos: T[],
  events: TimelineEvent[] = TIMELINE_EVENTS_FALLBACK
): Array<{ event: TimelineEvent; photos: T[] }> {
  const groups = new Map<string, { event: TimelineEvent; photos: T[] }>()

  for (const event of events) {
    groups.set(event.id, { event, photos: [] })
  }

  const UNCLASSIFIED = { id: "outros", label: "Outros momentos", emoji: "📷", start: "", end: "" }
  groups.set(UNCLASSIFIED.id, { event: UNCLASSIFIED, photos: [] })

  for (const photo of photos) {
    const event = getEventForDate(photo.date_taken, events)
    const key = event ? event.id : UNCLASSIFIED.id
    groups.get(key)!.photos.push(photo)
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      photos: [...group.photos].sort((a, b) => getPhotoTime(b) - getPhotoTime(a)),
    }))
    .filter((group) => group.photos.length > 0)
    .sort((a, b) => getPhotoTime(b.photos[0]) - getPhotoTime(a.photos[0]))
}

function getPhotoTime(photo: { created_at?: string | null; date_taken?: string | null }) {
  const date = photo.date_taken ?? photo.created_at
  if (!date) return 0
  const time = new Date(date).getTime()
  return Number.isNaN(time) ? 0 : time
}
