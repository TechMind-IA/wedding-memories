export interface ExifData {
  date_taken?: string
  latitude?: number
  longitude?: number
}

/**
 * Extrai apenas data e GPS de uma imagem.
 * Usa require dinâmico pois exifr é um módulo CommonJS.
 * Retorna objeto vazio se não houver EXIF ou der erro.
 */
export async function extractExif(buffer: Buffer, mimeType: string): Promise<ExifData> {
  if (!mimeType.startsWith("image/")) return {}

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const exifr = require("exifr")

    const exif = await exifr.parse(buffer, {
      gps: true,
      pick: ["DateTimeOriginal", "CreateDate", "latitude", "longitude"],
    })

    if (!exif) return {}

    return {
      date_taken: exif.DateTimeOriginal?.toISOString() ?? exif.CreateDate?.toISOString(),
      latitude: exif.latitude,
      longitude: exif.longitude,
    }
  } catch {
    return {}
  }
}