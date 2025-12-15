/**
 * Vimeo utility functions for extracting video IDs and generating embed URLs
 */

export interface VimeoEmbedOptions {
  autoplay?: boolean
  controls?: boolean
  loop?: boolean
  muted?: boolean
  responsive?: boolean
  title?: boolean
  byline?: boolean
  portrait?: boolean
}

/**
 * Extract Vimeo video ID from various URL formats
 * Supports:
 * - https://vimeo.com/123456789
 * - https://vimeo.com/123456789?h=abc123
 * - https://player.vimeo.com/video/123456789
 * - Direct video ID: 123456789
 */
export function extractVimeoId(urlOrId: string): string | null {
  if (!urlOrId) return null

  // If it's already just a number (video ID), return it
  if (/^\d+$/.test(urlOrId.trim())) {
    return urlOrId.trim()
  }

  // Try to extract from various Vimeo URL formats
  const patterns = [
    // https://vimeo.com/123456789
    /vimeo\.com\/(\d+)/,
    // https://player.vimeo.com/video/123456789
    /player\.vimeo\.com\/video\/(\d+)/,
    // https://vimeo.com/123456789?h=abc123
    /vimeo\.com\/(\d+)\?/,
  ]

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Check if a URL is a Vimeo URL
 */
export function isVimeoUrl(url: string): boolean {
  if (!url) return false
  return /vimeo\.com/.test(url) || /^\d+$/.test(url.trim())
}

/**
 * Generate Vimeo embed URL with options
 */
export function getVimeoEmbedUrl(videoId: string, options: VimeoEmbedOptions = {}): string {
  const {
    autoplay = false,
    controls = true,
    loop = false,
    muted = false,
    responsive = true,
    title = true,
    byline = true,
    portrait = true,
  } = options

  const params = new URLSearchParams()
  params.set('autoplay', autoplay ? '1' : '0')
  params.set('controls', controls ? '1' : '0')
  params.set('loop', loop ? '1' : '0')
  params.set('muted', muted ? '1' : '0')
  params.set('responsive', responsive ? '1' : '0')
  params.set('title', title ? '1' : '0')
  params.set('byline', byline ? '1' : '0')
  params.set('portrait', portrait ? '1' : '0')

  return `https://player.vimeo.com/video/${videoId}?${params.toString()}`
}

/**
 * Validate Vimeo video ID format
 */
export function isValidVimeoId(videoId: string): boolean {
  return /^\d+$/.test(videoId.trim())
}

