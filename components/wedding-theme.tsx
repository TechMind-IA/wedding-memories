/**
 * Nome: components/wedding-theme.tsx
 * Função: Injeta CSS variables dinâmicas do tema do casamento.
 * Gera paleta a partir da cor principal e aplica fonte escolhida.
 */

"use client"

import { useMemo } from "react"
import { generateThemePalette } from "@/lib/color-utils"

const FONT_MAP: Record<string, string> = {
  montserrat: "var(--font-dm-sans)",
  playfair: "var(--font-playfair)",
  popsans: "var(--font-poppins)",
  lora: "var(--font-lora)",
}

export function WeddingTheme({
  themeColor,
  fontFamily,
  children,
}: {
  themeColor: string
  fontFamily: string
  children: React.ReactNode
}) {
  const css = useMemo(() => {
    const palette = generateThemePalette(themeColor)
    const fontVar = FONT_MAP[fontFamily] || FONT_MAP.montserrat

    return `
:root {
  --background: ${palette.background};
  --foreground: ${palette.foreground};
  --card: ${palette.card};
  --card-foreground: ${palette.cardForeground};
  --popover: ${palette.popover};
  --popover-foreground: ${palette.popoverForeground};
  --primary: ${palette.primary};
  --primary-foreground: ${palette.primaryForeground};
  --secondary: ${palette.secondary};
  --secondary-foreground: ${palette.secondaryForeground};
  --muted: ${palette.muted};
  --muted-foreground: ${palette.mutedForeground};
  --accent: ${palette.accent};
  --accent-foreground: ${palette.accentForeground};
  --destructive: ${palette.destructive};
  --destructive-foreground: ${palette.destructiveForeground};
  --border: ${palette.border};
  --input: ${palette.input};
  --ring: ${palette.ring};
  --chart-1: ${palette.chart1};
  --chart-2: ${palette.chart2};
  --chart-3: ${palette.chart3};
  --chart-4: ${palette.chart4};
  --chart-5: ${palette.chart5};
  --sidebar-background: ${palette.sidebarBackground};
  --sidebar-foreground: ${palette.sidebarForeground};
  --sidebar-primary: ${palette.sidebarPrimary};
  --sidebar-primary-foreground: ${palette.sidebarPrimaryForeground};
  --sidebar-accent: ${palette.sidebarAccent};
  --sidebar-accent-foreground: ${palette.sidebarAccentForeground};
  --sidebar-border: ${palette.sidebarBorder};
  --sidebar-ring: ${palette.sidebarRing};
  --wedding-font: ${fontVar};
}
body {
  font-family: var(--wedding-font), system-ui, sans-serif;
}
`
  }, [themeColor, fontFamily])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {children}
    </>
  )
}
