const HEX6_RE = /^#([0-9a-fA-F]{6})$/

export function isHex6(value) {
  return HEX6_RE.test(value || '')
}

function hexToRgb01(hex) {
  if (!isHex6(hex)) return null
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return { r, g, b }
}

function srgbToLinear(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex) {
  const rgb = hexToRgb01(hex)
  if (!rgb) return null
  const R = srgbToLinear(rgb.r)
  const G = srgbToLinear(rgb.g)
  const B = srgbToLinear(rgb.b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

export function contrastRatio(hexA, hexB) {
  const La = relativeLuminance(hexA)
  const Lb = relativeLuminance(hexB)
  if (La === null || Lb === null) return null
  const lighter = Math.max(La, Lb)
  const darker = Math.min(La, Lb)
  return (lighter + 0.05) / (darker + 0.05)
}


