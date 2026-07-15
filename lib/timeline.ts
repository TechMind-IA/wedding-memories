/**
 * Nome: lib/timeline.ts
 * Função: Concentra utilitários de Timeline usados pela aplicação.
 */

/**
 * Interface para eventos vindos do banco de dados.
 */
export interface TimelineEventDB {
  id: string
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
  /** ISO string de início (data ou datetime) */
  start: string
  /** ISO string de fim (data ou datetime) */
  end: string
}

/**
 * Fallback: eventos hardcoded caso o banco esteja vazio.
 */
export const TIMELINE_EVENTS_FALLBACK: TimelineEvent[] = [
  {
    id: "cha-panela",
    label: "Chá de Panela",
    emoji: "🏠",
    start: "2026-06-13",
    end: "2026-06-14",
  },
  {
    id: "despedida-solteira",
    label: "Despedida de Solteira",
    emoji: "👰",
    start: "2026-11-01",
    end: "2026-11-01",
  },
  {
    id: "despedida-solteiro",
    label: "Despedida de Solteiro",
    emoji: "🤵",
    start: "2026-11-02",
    end: "2026-11-02",
  },
  {
    id: "cerimonia",
    label: "Cerimônia",
    emoji: "💍",
    start: "2026-10-10T14:00",
    end: "2026-10-10T17:29",
  },
  {
    id: "festa",
    label: "Festa",
    emoji: "🎉",
    start: "2026-10-10T17:30",
    end: "2026-10-11T01:00",
  },
  {
    id: "after",
    label: "After",
    emoji: "🎉",
    start: "2026-10-11T01:01",
    end: "2026-10-12T23:59",
  },
  {
    id: "pre-wedding",
    label: "Pré-Wedding",
    emoji: "💍",
    start: "2026-03-05",
    end: "2026-03-05",
  },
]

/** Evento especial para fotos sem data ou fora dos intervalos */
export const UNCLASSIFIED_EVENT: TimelineEvent = {
  id: "outros",
  label: "Outros momentos",
  emoji: "📷",
  start: "",
  end: "",
}

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
 * Busca eventos da timeline.
 * Tenta buscar do banco; se falhar ou retornar vazio, usa o fallback hardcoded.
 */
export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  try {
    const { getTimelineEventsFromDB } = await import("@/lib/db")
    const dbEvents = await getTimelineEventsFromDB()
    if (dbEvents.length > 0) {
      return dbEventsToTimelineEvents(dbEvents)
    }
  } catch (error) {
    console.warn("[timeline] Erro ao buscar do banco, usando fallback:", error)
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
  // Se tem horário (contém "T"), parse direto
  if (dateStr.includes("T")) {
    return new Date(dateStr)
  }
  // Se é só data (YYYY-MM-DD), início = 00:00:00 / fim = 23:59:59
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
 * Agrupa fotos pelos eventos da timeline (versão síncrona — usa eventos já carregados).
 * Dentro de cada grupo, fotos mais recentes aparecem primeiro.
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

  // Inicializa grupos na ordem certa
  for (const event of events) {
    groups.set(event.id, { event, photos: [] })
  }
  groups.set(UNCLASSIFIED_EVENT.id, { event: UNCLASSIFIED_EVENT, photos: [] })

  for (const photo of photos) {
    const event = getEventForDate(photo.date_taken, events)
    const key = event ? event.id : UNCLASSIFIED_EVENT.id
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
