#!/usr/bin/env node

/**
 * Script to copy PDFKit font files to a location that will be included in the Next.js build.
 * This ensures fonts are available in serverless environments.
 */

const fs = require('fs')
const path = require('path')

// Find the root of the monorepo (go up from apps/lms/scripts)
const rootDir = path.join(__dirname, '../../../')
const sourceDir = path.join(rootDir, 'node_modules/pdfkit/js/data')
const destDir = path.join(__dirname, '../lib/certificates/fonts')

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true })
}

// Copy all .afm font files
try {
  const fontFiles = fs.readdirSync(sourceDir).filter(file => file.endsWith('.afm'))
  
  console.log(`Copying ${fontFiles.length} font files from ${sourceDir} to ${destDir}...`)
  
  fontFiles.forEach(file => {
    const sourcePath = path.join(sourceDir, file)
    const destPath = path.join(destDir, file)
    fs.copyFileSync(sourcePath, destPath)
    console.log(`  ✓ Copied ${file}`)
  })
  
  console.log('✓ Font files copied successfully!')
} catch (error) {
  console.error('Error copying font files:', error)
  process.exit(1)
}
