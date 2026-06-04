/**
 * Nome: lib/exif.ts
 * Função: Concentra utilitários de Exif usados pela aplicação.
 */

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
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "DateTime",
        "ModifyDate",
        // Tags GPS brutas necessárias para exifr calcular latitude/longitude
        "GPSLatitude",
        "GPSLatitudeRef",
        "GPSLongitude",
        "GPSLongitudeRef",
      ],
    })

    // 🔍 DEBUG: remova este log após identificar o problema
    console.log("[extractExif] EXIF bruto recebido:", JSON.stringify(exif, null, 2))

    if (!exif) {
      console.log("[extractExif] Nenhum dado EXIF encontrado na imagem.")
      return {}
    }

    const date_taken =
      exif.DateTimeOriginal?.toISOString() ??
      exif.CreateDate?.toISOString() ??
      exif.DateTime?.toISOString() ??
      exif.ModifyDate?.toISOString()

    console.log("[extractExif] date_taken resolvido:", date_taken ?? "nenhum")
    console.log("[extractExif] GPS:", { latitude: exif.latitude, longitude: exif.longitude })

    return {
      date_taken,
      latitude: exif.latitude,
      longitude: exif.longitude,
    }
  } catch (error) {
    console.error("[extractExif] Erro ao processar EXIF:", error)
    return {}
  }
}
