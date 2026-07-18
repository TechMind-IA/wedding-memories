/**
 * Nome: lib/color-utils.ts
 * Função: Gera paleta de tema completa a partir de uma cor hex.
 * Usado para personalização visual por casamento.
 */

export interface HSL {
  h: number
  s: number
  l: number
}

const DEFAULT_PRIMARY = "#C2754F"

/**
 * Converte hex "#C2754F" para HSL { h, s, l } (h: 0-360, s/l: 0-100).
 */
export function hexToHsl(hex: string): HSL {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    case b: h = ((r - g) / d + 4) / 6; break
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Converte HSL para string "H S% L%" (formato CSS sem hsl()).
 */
export function hslToString(hsl: HSL): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`
}

/**
 * Ajusta HSL com offsets parciais.
 */
function adjustHsl(
  hsl: HSL,
  hOffset: number,
  sOffset: number,
  lOffset: number
): HSL {
  return {
    h: (hsl.h + hOffset + 360) % 360,
    s: Math.max(0, Math.min(100, hsl.s + sOffset)),
    l: Math.max(0, Math.min(100, hsl.l + lOffset)),
  }
}

/**
 * Calcula luminância relativa (WCAG 2.0).
 */
function relativeLuminance(hsl: HSL): number {
  const sRGB = hsl.s / 100
  const lRGB = hsl.l / 100
  const a = sRGB * Math.min(lRGB, 1 - lRGB)
  const f = (n: number) => {
    const k = (n + hsl.h / 30) % 12
    const color = lRGB - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(Math.max(0, Math.min(1, color)) * 255)
  }
  const r = f(0) / 255
  const g = f(8) / 255
  const b = f(4) / 255

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * Calcula ratio de contraste WCAG entre duas cores.
 */
export function getContrastRatio(fg: HSL, bg: HSL): number {
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Retorna preto ou branco com melhor contraste contra a cor dada.
 */
export function getBestForeground(hsl: HSL): HSL {
  const white: HSL = { h: 0, s: 0, l: 100 }
  const black: HSL = { h: 0, s: 0, l: 0 }
  const contrastWhite = getContrastRatio(white, hsl)
  const contrastBlack = getContrastRatio(black, hsl)
  return contrastWhite >= contrastBlack ? white : black
}

/**
 * Valida hex. Retorna fallback se inválido.
 */
export function validateHex(hex: string, fallback: string = DEFAULT_PRIMARY): string {
  if (!hex || typeof hex !== "string") return fallback
  const clean = hex.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return fallback
  return `#${clean.toLowerCase()}`
}

export interface ThemePalette {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
  sidebarBackground: string
  sidebarForeground: string
  sidebarPrimary: string
  sidebarPrimaryForeground: string
  sidebarAccent: string
  sidebarAccentForeground: string
  sidebarBorder: string
  sidebarRing: string
}

/**
 * Gera paleta de tema completa a partir de um hex.
 * Todas as cores são strings "H S% L%" (formato CSS variables).
 */
export function generateThemePalette(primaryHex: string): ThemePalette {
  const hex = validateHex(primaryHex)
  const primary = hexToHsl(hex)

  const foreground = adjustHsl(primary, 0, -10, -15)
  foreground.l = Math.max(12, Math.min(20, foreground.l))

  const primaryForeground = getBestForeground(primary)

  const background = adjustHsl(primary, 2, -60, 64)
  background.s = Math.max(20, Math.min(40, background.s))
  background.l = Math.max(95, Math.min(98, background.l))

  const card = adjustHsl(background, 0, -5, 1)

  const secondary = adjustHsl(primary, 5, -20, 55)
  secondary.s = Math.max(25, Math.min(45, secondary.s))
  secondary.l = Math.max(86, Math.min(92, secondary.l))

  const secondaryForeground = adjustHsl(primary, 0, -15, -8)

  const muted = adjustHsl(primary, 3, -25, 58)
  muted.s = Math.max(20, Math.min(40, muted.s))
  muted.l = Math.max(90, Math.min(95, muted.l))

  const mutedForeground = adjustHsl(primary, 0, -30, 20)
  mutedForeground.l = Math.max(40, Math.min(55, mutedForeground.l))

  const accent = adjustHsl(primary, 15, -10, 20)
  accent.l = Math.max(45, Math.min(60, accent.l))

  const accentForeground = adjustHsl(primary, 0, -5, -10)

  const destructive: HSL = { h: 0, s: 84, l: 60 }
  const destructiveForeground: HSL = { h: 0, s: 0, l: 98 }

  const border = adjustHsl(primary, 2, -20, 48)
  border.s = Math.max(20, Math.min(40, border.s))

  const input = { ...border }

  const ring = { ...primary }

  const chart1 = { ...primary }
  const chart2 = adjustHsl(primary, 40, -20, 5)
  const chart3 = adjustHsl(primary, -25, -5, 5)
  const chart4 = adjustHsl(primary, 15, -15, 18)
  const chart5 = adjustHsl(primary, -5, -10, 12)

  const sidebarBackground = { ...muted }
  const sidebarForeground = { ...foreground }
  const sidebarPrimary = { ...primary }
  const sidebarPrimaryForeground = { ...primaryForeground }
  const sidebarAccent = { ...secondary }
  const sidebarAccentForeground = { ...secondaryForeground }
  const sidebarBorder = { ...border }
  const sidebarRing = { ...ring }

  return {
    background: hslToString(background),
    foreground: hslToString(foreground),
    card: hslToString(card),
    cardForeground: hslToString(foreground),
    popover: hslToString(card),
    popoverForeground: hslToString(foreground),
    primary: hslToString(primary),
    primaryForeground: hslToString(primaryForeground),
    secondary: hslToString(secondary),
    secondaryForeground: hslToString(secondaryForeground),
    muted: hslToString(muted),
    mutedForeground: hslToString(mutedForeground),
    accent: hslToString(accent),
    accentForeground: hslToString(accentForeground),
    destructive: hslToString(destructive),
    destructiveForeground: hslToString(destructiveForeground),
    border: hslToString(border),
    input: hslToString(input),
    ring: hslToString(ring),
    chart1: hslToString(chart1),
    chart2: hslToString(chart2),
    chart3: hslToString(chart3),
    chart4: hslToString(chart4),
    chart5: hslToString(chart5),
    sidebarBackground: hslToString(sidebarBackground),
    sidebarForeground: hslToString(sidebarForeground),
    sidebarPrimary: hslToString(sidebarPrimary),
    sidebarPrimaryForeground: hslToString(sidebarPrimaryForeground),
    sidebarAccent: hslToString(sidebarAccent),
    sidebarAccentForeground: hslToString(sidebarAccentForeground),
    sidebarBorder: hslToString(sidebarBorder),
    sidebarRing: hslToString(sidebarRing),
  }
}
