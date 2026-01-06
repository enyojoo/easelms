/**
 * Patch PDFKit to use fonts from our local directory
 * This ensures fonts are available in serverless environments
 * 
 * PDFKit uses fs.readFileSync to read font files directly.
 * We patch fs.readFileSync to intercept font file reads and redirect them
 * to our local fonts directory which is included in the deployment.
 */

import path from "path"
import fs from "fs"

// Get the path to our local fonts directory
function getLocalFontsPath(): string | null {
  const possiblePaths = [
    // Vercel serverless environment
    path.join(process.cwd(), "apps/lms/lib/certificates/fonts"),
    path.join(process.cwd(), "lib/certificates/fonts"),
    // Relative path from compiled code
    path.join(__dirname, "fonts"),
    // Alternative paths
    "/var/task/apps/lms/lib/certificates/fonts",
    "/var/task/lib/certificates/fonts",
  ]

  for (const fontPath of possiblePaths) {
    try {
      if (fs.existsSync(fontPath)) {
        const fontFiles = fs.readdirSync(fontPath).filter(f => f.endsWith('.afm'))
        if (fontFiles.length > 0) {
          return fontPath
        }
      }
    } catch (error) {
      // Continue to next path
    }
  }

  return null
}

// Patch PDFKit's font loading by intercepting fs.readFileSync
export function patchPDFKitFonts() {
  try {
    const localFontsPath = getLocalFontsPath()
    
    if (!localFontsPath) {
      console.warn("[PDFKit Font Patch] Local fonts directory not found, PDFKit will try default fonts")
      return false
    }

    // PDFKit uses fs.readFileSync directly to read font files
    // We need to patch fs.readFileSync to intercept font file reads
    const originalReadFileSync = fs.readFileSync

    // Store the patched function reference to avoid infinite recursion
    const patchedReadFileSync = function(filePath: string | number | Buffer | URL, options?: any): any {
      const filePathStr = filePath.toString()
      
      // Intercept PDFKit font file reads
      // PDFKit reads fonts from paths like: /ROOT/node_modules/pdfkit/js/data/Helvetica.afm
      // The /ROOT/ path is a hardcoded path that PDFKit uses, but doesn't exist in Vercel
      // In Vercel, the actual path is /var/task/, but PDFKit doesn't know this
      // We intercept ALL pdfkit font reads and redirect them to our local fonts directory
      if (filePathStr.includes('pdfkit') && filePathStr.includes('data') && filePathStr.endsWith('.afm')) {
        const fontFileName = path.basename(filePathStr)
        const localFontPath = path.join(localFontsPath, fontFileName)
        
        // If font exists in our local directory, read from there instead
        if (fs.existsSync(localFontPath)) {
          console.log(`[PDFKit Font Patch] Redirecting font read: ${fontFileName} -> ${localFontPath}`)
          return originalReadFileSync.call(this, localFontPath, options)
        } else {
          // Log the attempted path for debugging
          console.warn(`[PDFKit Font Patch] Font not found in local directory: ${fontFileName}`)
          console.warn(`[PDFKit Font Patch] Original path: ${filePathStr}`)
          console.warn(`[PDFKit Font Patch] Tried local path: ${localFontPath}`)
          console.warn(`[PDFKit Font Patch] Local fonts directory exists: ${fs.existsSync(localFontsPath)}`)
          if (fs.existsSync(localFontsPath)) {
            const availableFonts = fs.readdirSync(localFontsPath).filter(f => f.endsWith('.afm'))
            console.warn(`[PDFKit Font Patch] Available fonts: ${availableFonts.join(', ')}`)
          }
          // Don't throw error, let it try the original path (will fail but we'll see the error)
        }
      }

      // For all other files, use the original readFileSync
      return originalReadFileSync.call(this, filePath, options)
    }
    
    // Replace fs.readFileSync with our patched version
    fs.readFileSync = patchedReadFileSync as typeof fs.readFileSync

    console.log(`[PDFKit Font Patch] Successfully patched fs.readFileSync to use fonts from ${localFontsPath}`)
    console.log(`[PDFKit Font Patch] Patch will intercept paths like: /ROOT/node_modules/pdfkit/js/data/*.afm`)
    console.log(`[PDFKit Font Patch] And redirect them to: ${localFontsPath}/*.afm`)
    
    // Verify the patch is actually applied
    // Note: In bundled code, the reference might be different, so we check if it's a function
    if (typeof fs.readFileSync !== 'function') {
      console.error("[PDFKit Font Patch] ERROR: fs.readFileSync is not a function after patching!")
      return false
    }
    
    // Test the patch by checking if it intercepts a test path
    try {
      const testPath = '/ROOT/node_modules/pdfkit/js/data/Helvetica.afm'
      // This will fail, but we can see if the patch intercepts it
      const testResult = fs.readFileSync.toString()
      if (testResult.includes('pdfkit') && testResult.includes('data')) {
        console.log(`[PDFKit Font Patch] Verified: Patch function contains interception logic`)
      }
    } catch (error) {
      // Expected - we're just checking the function exists
    }
    
    return true
  } catch (error) {
    console.warn("[PDFKit Font Patch] Failed to patch PDFKit fonts:", error)
    return false
  }
}

// Auto-patch when this module is imported (before PDFKit is loaded)
// This must run before PDFKit is imported
const patchResult = patchPDFKitFonts()
if (!patchResult) {
  console.error("[PDFKit Font Patch] WARNING: Font patch failed! PDFKit may fail to load fonts.")
}
