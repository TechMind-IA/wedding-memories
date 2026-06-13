/**
 * Nome: lib/exif-browser.ts
 * Função: Concentra utilitários de Exif Browser usados pela aplicação.
 */

export interface ExifData {
  date_taken?: string
  latitude?: number
  longitude?: number
}

/**
 * Extrai data e GPS de uma imagem no browser.
 * Usa import dinâmico pois exifr suporta ESM no browser.
 * Retorna objeto vazio se não houver EXIF ou der erro.
 */
export async function extractExifBrowser(file: File): Promise<ExifData> {
  if (!file.type.startsWith("image/")) return {}

  try {
    const exifr = await import("exifr")

    const exif = await exifr.parse(file, {
      gps: true,
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "DateTime",
        "ModifyDate",
        "GPSLatitude",
        "GPSLatitudeRef",
        "GPSLongitude",
        "GPSLongitudeRef",
      ],
    })

    if (!exif) {
      return {}
    }

    const date_taken =
      exif.DateTimeOriginal?.toISOString() ??
      exif.CreateDate?.toISOString() ??
      exif.DateTime?.toISOString() ??
      exif.ModifyDate?.toISOString()

    return {
      date_taken,
      latitude: exif.latitude,
      longitude: exif.longitude,
    }
  } catch (error) {
    console.error(`[extractExifBrowser] Erro em ${file.name}:`, error)
    return {}
  }
}
