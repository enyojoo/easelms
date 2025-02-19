export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

export function constructSafeUrl(baseUrl: string, path: string): string {
  try {
    const url = new URL(path, baseUrl)
    return url.toString()
  } catch (e) {
    console.error("Invalid URL:", e)
    return baseUrl // Return a safe default
  }
}

