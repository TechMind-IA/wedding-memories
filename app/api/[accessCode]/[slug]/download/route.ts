import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string; slug: string }> }
) {
  const { accessCode } = await params
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")
  const filename = searchParams.get("filename") || "foto"

  if (!url) return NextResponse.json({ error: "URL não informada" }, { status: 400 })

  const bucketName = process.env.AWS_S3_BUCKET_NAME
  if (!url.includes("amazonaws.com") || (bucketName && !url.includes(bucketName))) {
    return NextResponse.json({ error: "URL não permitida" }, { status: 403 })
  }

  const expectedPrefix = `weddings/${accessCode}/`
  const urlObj = new URL(url)
  const key = decodeURIComponent(urlObj.pathname.slice(1))
  if (!key.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Arquivo não pertence a este casamento" }, { status: 403 })
  }

  const response = await fetch(url)
  if (!response.ok) return NextResponse.json({ error: "Falha ao buscar arquivo" }, { status: 502 })

  const contentType = response.headers.get("content-type") || "application/octet-stream"
  const buffer = await response.arrayBuffer()

  return new NextResponse(buffer, {
    headers: { "Content-Type": contentType, "Content-Disposition": `attachment; filename="${filename}"` },
  })
}
