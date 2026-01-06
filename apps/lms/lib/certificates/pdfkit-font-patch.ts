/**
 * Patch PDFKit to use fonts from our local directory
 * This ensures fonts are available in serverless environments
 * 
 * PDFKit looks for fonts in node_modules/pdfkit/js/data by default.
 * We've copied fonts to lib/certificates/fonts which is included in Next.js builds.
 * This patch redirects PDFKit's font loading to use our local fonts.
 */

import path from "path"
import fs from "fs"

// Get the path to our local fonts directory
function getLocalFontsPath(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), "apps/lms/lib/certificates/fonts"),
    path.join(process.cwd(), "lib/certificates/fonts"),
    path.join(__dirname, "fonts"),
  ]

  for (const fontPath of possiblePaths) {
    if (fs.existsSync(fontPath)) {
      const fontFiles = fs.readdirSync(fontPath).filter(f => f.endsWith('.afm'))
      if (fontFiles.length > 0) {
        return fontPath
      }
    }
  }

  return null
}

// Patch PDFKit's font loading by modifying the module's font path resolution
export function patchPDFKitFonts() {
  try {
    const localFontsPath = getLocalFontsPath()
    
    if (!localFontsPath) {
      console.warn("[PDFKit Font Patch] Local fonts directory not found, PDFKit will use default fonts")
      return false
    }

    // PDFKit uses require.resolve internally to find font files
    // We need to patch this before PDFKit is loaded
    // Since we're importing this before PDFKit, we can patch Module._resolveFilename
    const Module = require('module')
    const originalResolveFilename = Module._resolveFilename

    Module._resolveFilename = function(request: string, parent: any, isMain: boolean, options: any) {
      // Intercept PDFKit font file requests
      // PDFKit requests fonts like: pdfkit/js/data/Helvetica.afm
      if (typeof request === 'string' && request.includes('pdfkit') && request.includes('data') && request.endsWith('.afm')) {
        const fontFileName = path.basename(request)
        const localFontPath = path.join(localFontsPath, fontFileName)
        
        // If font exists in our local directory, return that path
        if (fs.existsSync(localFontPath)) {
          return localFontPath
        }
      }

      // Otherwise, use the original resolution
      return originalResolveFilename.call(this, request, parent, isMain, options)
    }

    console.log(`[PDFKit Font Patch] Successfully patched PDFKit to use fonts from ${localFontsPath}`)
    return true
  } catch (error) {
    console.warn("[PDFKit Font Patch] Failed to patch PDFKit fonts:", error)
    return false
  }
}

// Auto-patch when this module is imported (before PDFKit is loaded)
patchPDFKitFonts()
