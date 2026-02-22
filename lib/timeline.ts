/**
 * Linha do tempo hardcoded do casamento.
 * Ajuste as datas conforme os eventos reais.
 *
 * Para o dia do casamento, Cerimônia e Festa são separados por horário:
 *   - Cerimônia: início do dia até CUT_HOUR (exclusive)
 *   - Festa:     a partir de CUT_HOUR
 */

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
 * Defina aqui as datas reais de cada evento.
 * - Para eventos de um dia inteiro: use "YYYY-MM-DD" (começa 00:00, termina 23:59:59)
 * - Para eventos com horário: use "YYYY-MM-DDTHH:MM"
 */
export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "cha-panela",
    label: "Chá de Panela",
    emoji: "🏠",
    start: "2026-10-01",
    end: "2026-10-01",
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
    // Início do dia do casamento até 18h
    start: "2026-12-19T00:00",
    end: "2026-12-19T18:00",
  },
  {
    id: "festa",
    label: "Festa",
    emoji: "🎉",
    // Das 18h até o fim do dia seguinte
    start: "2026-12-19T18:00",
    end: "2026-12-20T06:00",
  },
  {
    id: "carnaval",
    label: "Carnaval - 2026",
    emoji: "🎉🎭🪅🥳",
    start: "2026-02-16",
    end: "2026-02-17",
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
 * Retorna o evento da timeline ao qual uma foto pertence,
 * com base no `date_taken`. Se não houver data ou não encaixar
 * em nenhum evento, retorna `null`.
 */
export function getEventForDate(dateTaken: string | null | undefined): TimelineEvent | null {
  if (!dateTaken) return null

  const photoDate = new Date(dateTaken)
  if (isNaN(photoDate.getTime())) return null

  for (const event of TIMELINE_EVENTS) {
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
 * Agrupa um array de fotos pelos eventos da timeline.
 * Retorna apenas os grupos que têm pelo menos 1 foto.
 * A ordem segue a ordem definida em TIMELINE_EVENTS.
 * Fotos sem evento vão para "Outros momentos".
 */
export function groupPhotosByTimeline<T extends { id: string; date_taken?: string | null }>(
  photos: T[]
): Array<{ event: TimelineEvent; photos: T[] }> {
  const groups = new Map<string, { event: TimelineEvent; photos: T[] }>()

  // Inicializa grupos na ordem certa
  for (const event of TIMELINE_EVENTS) {
    groups.set(event.id, { event, photos: [] })
  }
  groups.set(UNCLASSIFIED_EVENT.id, { event: UNCLASSIFIED_EVENT, photos: [] })

  for (const photo of photos) {
    const event = getEventForDate(photo.date_taken)
    const key = event ? event.id : UNCLASSIFIED_EVENT.id
    groups.get(key)!.photos.push(photo)
  }

  // Retorna apenas grupos com fotos, na ordem definida
  return [...groups.values()].filter((g) => g.photos.length > 0)
}