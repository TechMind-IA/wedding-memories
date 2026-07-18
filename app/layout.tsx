/**
 * Nome: app/layout.tsx
 * Função: Define o layout raiz, metadados e provedores globais da aplicação.
 */

import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, DM_Sans, Playfair_Display, Poppins, Lora } from "next/font/google"

import "./globals.css"

const _inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const _dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
})

const _playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
})

const _poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

const _lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Wedding Memories",
  description:
    "Galeria colaborativa de fotos do casamento. Compartilhe suas memórias!",
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
    <html lang="pt-BR" className={`${_inter.variable} ${_dmSans.variable} ${_playfair.variable} ${_poppins.variable} ${_lora.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
