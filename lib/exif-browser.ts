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

    // 🔍 DEBUG COMPLETO
    console.log(`[extractExifBrowser] Raw EXIF de ${file.name}:`, exif)

    if (!exif) {
      console.log(`[extractExifBrowser] Nenhum EXIF em: ${file.name}`)
      return {}
    }

    const date_taken =
      exif.DateTimeOriginal?.toISOString() ??
      exif.CreateDate?.toISOString() ??
      exif.DateTime?.toISOString() ??
      exif.ModifyDate?.toISOString()

    console.log(`[extractExifBrowser] ${file.name} → date_taken: ${date_taken ?? "nenhum"}, GPS: ${exif.latitude}, ${exif.longitude}`)

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
