/**
 * Image placeholder utilities
 * Provides blurred placeholder generation using Blurhash or CSS-based solutions
 */

import { decode } from 'blurhash'

// Base64 encoded blurred placeholder SVG with gradient
const BLURRED_PLACEHOLDER_BASE64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cud3Mub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmM2Y0ZjY7c3RvcC1vcGFjaXR5OjEiLz48c3RvcCBvZmZzZXQ9IjUwJSIgc3R5bGU9InN0b3AtY29sb3I6I2U1ZTdlYjtzdG9wLW9wYWNpdHk6MSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6I2QxZDViYztzdG9wLW9wYWNpdHk6MSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4="

/**
 * Generate a CSS-based blurred placeholder
 * Creates a gradient background with blur effect
 */
export function generateBlurredPlaceholder(width: number = 400, height: number = 300): string {
  // Create a simple gradient placeholder as base64 SVG
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#e5e7eb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#d1d5db;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
    </svg>
  `.trim()
  
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/**
 * Get a blurred placeholder image
 * Returns a base64 encoded SVG with gradient blur effect
 */
export function getBlurredPlaceholder(width?: number, height?: number): string {
  if (width && height) {
    return generateBlurredPlaceholder(width, height)
  }
  return BLURRED_PLACEHOLDER_BASE64
}

/**
 * Decode a Blurhash string to a canvas data URL
 * @param blurhash - The Blurhash string
 * @param width - Width of the decoded image (default: 32)
 * @param height - Height of the decoded image (default: 32)
 * @param punch - Contrast adjustment (default: 1)
 * @returns Data URL of the decoded image
 */
export function decodeBlurhash(
  blurhash: string,
  width: number = 32,
  height: number = 32,
  punch: number = 1
): string {
  try {
    const pixels = decode(blurhash, width, height, punch)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      return getBlurredPlaceholder(width, height)
    }
    
    const imageData = ctx.createImageData(width, height)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
    
    return canvas.toDataURL()
  } catch (error) {
    console.warn('Failed to decode blurhash:', error)
    return getBlurredPlaceholder(width, height)
  }
}

/**
 * Create a blurhash-like effect using CSS
 * This provides a smooth gradient placeholder that looks like a blurred image
 */
export function createBlurHashStyle(colors?: string[]): React.CSSProperties {
  const defaultColors = ['#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af']
  const gradientColors = colors || defaultColors
  
  return {
    background: `linear-gradient(135deg, ${gradientColors.join(', ')})`,
    filter: 'blur(20px)',
    transform: 'scale(1.1)',
  } as React.CSSProperties
}

