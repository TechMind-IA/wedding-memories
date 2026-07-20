import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 })
    }

    const phoneHtml = phone ? `<p><strong>Telefone:</strong> ${phone}</p>` : ""

    const { data, error } = await resend.emails.send({
      from: "contato@weddingmemories.com.br",
      to: "contato@weddingmemories.com.br",
      replyTo: email,
      subject: `Contato - Wedding Memories | ${name}`,
      html: `
        <h2>Novo contato via site</h2>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        ${phoneHtml}
        <p><strong>Mensagem:</strong></p>
        <p>${message}</p>
        <hr />
        <p style="color: #888; font-size: 12px;">Enviado pelo formulário de contato do Wedding Memories.</p>
      `,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ error: "Erro ao enviar mensagem." }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
