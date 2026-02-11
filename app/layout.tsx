import React from "react"
import type { Metadata, Viewport } from "next"
import { Playfair_Display, Lato } from "next/font/google"

import "./globals.css"

const _playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const _lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Nosso Album - Brenda & Jamelão",
  description:
    "Galeria colaborativa de fotos do casamento de Brenda & Jamelão. Compartilhe suas memórias!",
}

export const viewport: Viewport = {
  themeColor: "#C2754F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${_playfair.variable} ${_lato.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
