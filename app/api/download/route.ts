import { NextRequest, NextResponse } from "next/server"

// Proxy de download — busca o arquivo do S3 no servidor e repassa ao browser
// Isso evita o erro de CORS ao fazer fetch direto para o S3 no cliente
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")
  const filename = searchParams.get("filename") || "foto"

  if (!url) {
    return NextResponse.json({ error: "URL não informada" }, { status: 400 })
  }

  // Valida que a URL é do nosso bucket S3
  const bucketName = process.env.AWS_S3_BUCKET_NAME
  if (!url.includes("amazonaws.com") || (bucketName && !url.includes(bucketName))) {
    return NextResponse.json({ error: "URL não permitida" }, { status: 403 })
  }

  const response = await fetch(url)

  if (!response.ok) {
    return NextResponse.json({ error: "Falha ao buscar arquivo" }, { status: 502 })
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream"
  const buffer = await response.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}