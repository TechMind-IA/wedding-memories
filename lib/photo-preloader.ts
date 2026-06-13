/**
 * Nome: lib/photo-preloader.ts
 * Função: Aquece as imagens da galeria no cache do navegador.
 */

import type { Photo } from "@/hooks/use-photos"

const PAGE_SIZE = 80
const LIGHTBOX_IMAGE_QUALITY = 35
const CARD_IMAGE_QUALITY = 40
const PRELOAD_CONCURRENCY = 10

interface PhotosPageResponse {
  photos?: Photo[]
  hasMore?: boolean
  nextCursor?: string | null
}

const preloadedUrls = new Set<string>()
let preloadPromise: Promise<void> | null = null

function getOptimizedImageUrl(src: string, width: number, quality: number) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`
}

function getPreloadUrls(src: string) {
  if (!src || typeof window === "undefined") return null

  const viewportWidth = window.innerWidth
  const lightboxWidth = viewportWidth <= 768 ? 750 : 640
  const cardWidth = viewportWidth <= 768 ? 384 : 256

  return [
    getOptimizedImageUrl(src, lightboxWidth, LIGHTBOX_IMAGE_QUALITY),
    getOptimizedImageUrl(src, cardWidth, CARD_IMAGE_QUALITY),
  ]
}

async function fetchAllPhotos() {
  const photos: Photo[] = []
  let cursor: string | null = null

  do {
    const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
    const response = await fetch(`/api/photos?limit=${PAGE_SIZE}${cursorParam}`)
    if (!response.ok) {
      console.error("[photoPreloader] Falha ao buscar fotos:", response.status)
      break
    }

    const data = (await response.json()) as PhotosPageResponse
    photos.push(...(data.photos || []))
    cursor = data.hasMore ? data.nextCursor ?? null : null
  } while (cursor)

  return photos
}

function preloadImages(urls: string[]) {
  let nextIndex = 0

  const preloadNext = () => {
    if (nextIndex >= urls.length) return

    const src = urls[nextIndex]
    nextIndex += 1

    const image = new globalThis.Image()
    image.decoding = "async"
    image.onload = preloadNext
    image.onerror = preloadNext
    image.src = src
  }

  const starters = Math.min(PRELOAD_CONCURRENCY, urls.length)
  for (let i = 0; i < starters; i += 1) preloadNext()
}

export function preloadGalleryPhotos(options?: { force?: boolean }) {
  if (typeof window === "undefined") return
  if (preloadPromise && !options?.force) return

  preloadPromise = fetchAllPhotos()
    .then((photos) => {
      const urls = photos
        .filter((photo) => !photo.is_video)
        .flatMap((photo) => getPreloadUrls(photo.storage_url) ?? [])
        .filter((url): url is string => Boolean(url))
        .filter((url) => {
          if (preloadedUrls.has(url)) return false
          preloadedUrls.add(url)
          return true
        })

      preloadImages(urls)
    })
    .catch((error) => {
      console.error("[photoPreloader] Erro ao pré-carregar galeria:", error)
      preloadPromise = null
    })
}
