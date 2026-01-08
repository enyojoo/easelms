// Import font patch before PDFKit to ensure fonts are patched
import "./pdfkit-font-patch"
import PDFDocument from "pdfkit"
import { Readable } from "stream"
import path from "path"
import fs from "fs"

interface CertificateData {
  certificateNumber: string
  learnerName: string
  courseTitle: string
  issuedAt: string
  certificateType: "completion" | "participation" | "achievement"
  certificateTitle?: string // Custom certificate title (overrides default)
  certificateDescription?: string // Custom description with [student_name] placeholder
  certificateTemplate?: string // URL to certificate template/background image
  organizationName?: string
  logoUrl?: string // URL to platform logo (black version for white background)
  signatureImage?: string // URL to signature image (S3 URL)
  signatureName?: string // Name of the signer (e.g., "John Doe")
  signatureTitle?: string // Title of the signer (e.g., "Director of Education")
  additionalText?: string // Additional text to display on certificate
}

// Helper function to get the font directory path
// Works in both local development and Vercel serverless environments
function getFontDirectory(): string {
  // Try multiple possible locations for fonts
  const possiblePaths = [
    // Local fonts directory (for development and bundled in production)
    path.join(process.cwd(), "lib/certificates/fonts"),
    // Next.js build output (for Vercel serverless)
    path.join(process.cwd(), ".next/server/app/lib/certificates/fonts"),
    // Fallback to node_modules (if fonts are available there)
    path.join(process.cwd(), "node_modules/pdfkit/js/data"),
    // Alternative node_modules path (monorepo structure)
    path.join(process.cwd(), "../../node_modules/pdfkit/js/data"),
  ]

  for (const fontPath of possiblePaths) {
    if (fs.existsSync(fontPath)) {
      const fontFiles = fs.readdirSync(fontPath).filter(f => f.endsWith('.afm'))
      if (fontFiles.length > 0) {
        return fontPath
      }
    }
  }

  // Default fallback - PDFKit expects fonts here
  return path.join(process.cwd(), "node_modules/pdfkit/js/data")
}

// Helper function to fetch image from URL or data URL and return as buffer
async function fetchImageBuffer(url: string): Promise<Buffer> {
  // Handle base64 data URLs (for backward compatibility)
  if (url.startsWith("data:")) {
    const base64Data = url.split(",")[1]
    if (!base64Data) {
      throw new Error("Invalid data URL format")
    }
    return Buffer.from(base64Data, "base64")
  }
  
  // Handle regular URLs
  console.log("[PDF Generation] Fetching image from URL:", url)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
  }
  
  // Check content type
  const contentType = response.headers.get("content-type") || ""
  console.log("[PDF Generation] Image content type:", contentType)
  
  // PDFKit doesn't support SVG - we'll handle this in the calling code
  if (contentType.includes("svg") || url.toLowerCase().endsWith(".svg")) {
    console.warn("[PDF Generation] SVG image detected - PDFKit doesn't support SVG natively")
    // Return buffer anyway, caller will handle it
  }
  
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  console.log("[PDF Generation] Image fetched successfully, size:", buffer.length, "bytes")
  return buffer
}

// Helper function to get the path to Poppins font files
function getPoppinsFontPath(fontName: string): string | null {
  const possiblePaths = [
    path.join(process.cwd(), "apps/lms/lib/certificates/fonts", fontName),
    path.join(process.cwd(), "lib/certificates/fonts", fontName),
    path.join(__dirname, "fonts", fontName),
    path.join("/var/task/apps/lms/lib/certificates/fonts", fontName),
    path.join("/var/task/lib/certificates/fonts", fontName),
  ]

  for (const fontPath of possiblePaths) {
    if (fs.existsSync(fontPath)) {
      return fontPath
    }
  }

  return null
}

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Verify fonts are available before initializing PDFDocument
      // PDFKit initializes default fonts (Helvetica, Times, Courier) on creation
      // even if we use custom fonts, so we need the .afm files available
      const fontDir = getFontDirectory()
      if (!fs.existsSync(fontDir)) {
        throw new Error(
          `PDFKit font directory not found: ${fontDir}. ` +
          `Please ensure fonts are included in the deployment bundle.`
        )
      }
      
      const afmFiles = fs.readdirSync(fontDir).filter(f => f.endsWith('.afm'))
      if (afmFiles.length === 0) {
        throw new Error(
          `No .afm font files found in ${fontDir}. ` +
          `PDFKit requires these files to initialize. ` +
          `Available files: ${fs.readdirSync(fontDir).join(', ')}`
        )
      }
      
      console.log(`[PDF Generation] Found ${afmFiles.length} font files in ${fontDir}`)

      // Initialize PDFDocument
      // PDFKit will initialize default fonts, which our patch should redirect to local fonts
      // Use no margins - we'll handle spacing manually
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
        autoFirstPage: true,
      })
      
      // Prevent automatic page creation - we want everything on one page
      const originalAddPage = doc.addPage.bind(doc)
      doc.addPage = function() {
        console.warn("[PDF Generation] WARNING: Attempted to add new page - preventing to keep single page certificate")
        return this
      }

      // Register Poppins fonts (Google Fonts) to match the website design
      const poppinsRegular = getPoppinsFontPath("Poppins-Regular.ttf")
      const poppinsBold = getPoppinsFontPath("Poppins-Bold.ttf")
      const poppinsSemiBold = getPoppinsFontPath("Poppins-SemiBold.ttf")

      if (poppinsRegular) {
        doc.registerFont("Poppins", poppinsRegular)
        doc.registerFont("Poppins-Regular", poppinsRegular)
      }
      if (poppinsBold) {
        doc.registerFont("Poppins-Bold", poppinsBold)
      }
      if (poppinsSemiBold) {
        doc.registerFont("Poppins-SemiBold", poppinsSemiBold)
      }

      // Fallback: If Poppins fonts aren't available, PDFKit will use default fonts
      const usePoppins = poppinsRegular && poppinsBold

      const buffers: Buffer[] = []
      doc.on("data", buffers.push.bind(buffers))
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on("error", reject)

      // Fetch images asynchronously
      let logoBuffer: Buffer | null = null
      let signatureBuffer: Buffer | null = null
      let templateBuffer: Buffer | null = null

      try {
        if (data.logoUrl && data.logoUrl.trim() !== "") {
          console.log("[PDF Generation] Fetching logo from URL:", data.logoUrl)
          try {
          logoBuffer = await fetchImageBuffer(data.logoUrl)
            console.log("[PDF Generation] Logo fetched successfully, size:", logoBuffer.length, "bytes")
            if (!logoBuffer || logoBuffer.length === 0) {
              console.error("[PDF Generation] Logo buffer is empty after fetch")
              logoBuffer = null
            }
          } catch (fetchError) {
            console.error("[PDF Generation] Error fetching logo:", fetchError)
            console.error("[PDF Generation] Logo URL:", data.logoUrl)
            console.error("[PDF Generation] Error details:", fetchError instanceof Error ? fetchError.message : String(fetchError))
            logoBuffer = null
          }
        } else {
          console.log("[PDF Generation] No logo URL provided or URL is empty")
          console.log("[PDF Generation] logoUrl value:", data.logoUrl)
        }
      } catch (error) {
        console.error("[PDF Generation] Failed to fetch logo image:", error)
        console.error("[PDF Generation] Logo URL was:", data.logoUrl)
        logoBuffer = null
      }

      try {
        if (data.signatureImage) {
          signatureBuffer = await fetchImageBuffer(data.signatureImage)
        }
      } catch (error) {
        console.warn("Failed to fetch signature image:", error)
      }

      try {
        if (data.certificateTemplate) {
          templateBuffer = await fetchImageBuffer(data.certificateTemplate)
        }
      } catch (error) {
        console.warn("Failed to fetch certificate template image:", error)
      }

      // Ensure we're on the first page before rendering background
      // PDFKit creates the first page automatically, so we're already on page 1
      console.log("[PDF Generation] Rendering background on page:", doc.page)

      // Background - use template if provided, otherwise use hardcoded design
      // Render background FIRST before any content
      if (templateBuffer) {
        // Use template as full background
        try {
          console.log("[PDF Generation] Rendering template background")
          doc.image(templateBuffer, 0, 0, {
            width: doc.page.width,
            height: doc.page.height,
            fit: [doc.page.width, doc.page.height],
            align: 'center',
            valign: 'center',
          })
          console.log("[PDF Generation] Template background rendered successfully")
        } catch (error) {
          console.error("Failed to embed template image, using fallback:", error)
          // Fallback to hardcoded background
          doc.rect(0, 0, doc.page.width, doc.page.height).fill("#FEF9E7")
        }
      } else {
        // Hardcoded design (fallback)
        console.log("[PDF Generation] Rendering hardcoded background")
      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#FEF9E7")
      }

      // Border (only if no template - template may have its own borders)
      if (!templateBuffer) {
      // Border
      doc
        .lineWidth(3)
        .strokeColor("#2C3E50")
        .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .stroke()

      // Inner decorative border
      doc
        .lineWidth(1)
        .strokeColor("#7F8C8D")
        .rect(50, 50, doc.page.width - 100, doc.page.height - 100)
        .stroke()
      }

      console.log("[PDF Generation] Background and borders rendered, page dimensions:", {
        width: doc.page.width,
        height: doc.page.height,
      })

      // Calculate center positions for landscape layout
      // PDFKit uses bottom-left origin, so Y coordinates are from bottom
      const pageCenterX = doc.page.width / 2
      const pageCenterY = doc.page.height / 2
      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      
      console.log("[PDF Generation] Page dimensions:", {
        width: pageWidth,
        height: pageHeight,
        centerX: pageCenterX,
        centerY: pageCenterY,
      })
      
      // Helper function to convert Y from top to PDFKit's bottom-origin coordinate system
      const yFromTop = (y: number) => pageHeight - y
      
      // Start from top with proper margins
      const topMargin = 60
      let currentY = topMargin
      
      // Add logo (if available) - centered at top
      if (logoBuffer && logoBuffer.length > 0) {
        try {
          console.log("[PDF Generation] Attempting to embed logo, buffer size:", logoBuffer.length)
          
          // Place logo at top center
          // PDFKit: Y coordinate for images is the bottom of the image
          const logoWidth = 120
          const logoHeight = 40
          const logoX = pageCenterX - logoWidth / 2
          const logoYFromTop = currentY
          // For images: Y is bottom, so convert: pageHeight - (yFromTop + height)
          const logoYFromBottom = pageHeight - (logoYFromTop + logoHeight)
          
          console.log("[PDF Generation] Embedding logo at position:", {
            x: logoX,
            yFromTop: logoYFromTop,
            yFromBottom: logoYFromBottom,
            width: logoWidth,
            height: logoHeight,
            logoUrl: data.logoUrl,
            pageHeight,
            currentPage: doc.page,
          })
          
          // Check if logo URL is SVG - PDFKit doesn't support SVG directly
          const isSVG = data.logoUrl?.toLowerCase().endsWith('.svg') || 
                       (logoBuffer.toString('utf8', 0, Math.min(100, logoBuffer.length)).includes('<svg'))
          
          if (isSVG) {
            console.warn("[PDF Generation] Logo is SVG format - PDFKit doesn't support SVG. Converting or skipping.")
            // For SVG, we could convert to PNG or skip. For now, skip and show org name
            logoBuffer = null
          } else {
            // Render the image
            doc.image(logoBuffer, logoX, logoYFromBottom, {
              width: logoWidth,
              height: logoHeight,
              fit: [logoWidth, logoHeight],
            })
            
            currentY += logoHeight + 30 // Space after logo
            console.log("[PDF Generation] Logo embedded successfully at Y:", logoYFromBottom)
          }
        } catch (error) {
          console.error("[PDF Generation] Failed to embed logo in PDF:", error)
          console.error("[PDF Generation] Error details:", error instanceof Error ? error.message : String(error))
          console.error("[PDF Generation] Error stack:", error instanceof Error ? error.stack : undefined)
          console.error("[PDF Generation] Logo buffer size:", logoBuffer?.length)
          console.error("[PDF Generation] Logo URL:", data.logoUrl)
          // Continue without logo - will show org name as fallback
          logoBuffer = null
        }
      }
      
      // Show organization name if no logo was rendered
      if (!logoBuffer && data.organizationName && !templateBuffer) {
        console.log("[PDF Generation] Showing organization name as fallback for logo")
        const orgNameY = yFromTop(currentY)
        doc
          .fontSize(24)
          .fillColor("#2C3E50")
          .font(usePoppins ? "Poppins-Bold" : "Helvetica-Bold")
          .text(data.organizationName, pageCenterX, orgNameY, {
            align: "center",
          })
        currentY += 50
      } else if (!logoBuffer) {
        console.log("[PDF Generation] No logo buffer available and no org name fallback")
        console.log("[PDF Generation] Logo URL was:", data.logoUrl)
        console.log("[PDF Generation] Has org name:", !!data.organizationName)
        console.log("[PDF Generation] Has template:", !!templateBuffer)
      }

      // Title - Certificate of Completion/Participation
      // Certificate Title - use custom title if provided, otherwise use default based on type
      const getCertificateTitle = () => {
        if (data.certificateTitle) {
          return data.certificateTitle
        }
        switch (data.certificateType) {
          case "completion":
            return "Certificate of Completion"
          case "participation":
            return "Certificate of Participation"
          case "achievement":
            return "Certificate of Achievement"
          default:
            return "Certificate of Completion"
        }
      }

      // Certificate Title
      currentY += 20
      const titleY = yFromTop(currentY)
      doc
        .fontSize(36)
        .fillColor("#2C3E50")
        .font(usePoppins ? "Poppins-Bold" : "Helvetica-Bold")
        .text(
          getCertificateTitle(),
          pageCenterX,
          titleY,
          {
            align: "center",
          }
        )
      console.log("[PDF Generation] Certificate title rendered at Y:", titleY)

      // Decorative line (only if no template)
      currentY += 60
      const decorativeLineY = yFromTop(currentY)
      if (!templateBuffer) {
      doc
        .lineWidth(2)
        .strokeColor("#3498DB")
          .moveTo(pageCenterX - 150, decorativeLineY)
          .lineTo(pageCenterX + 150, decorativeLineY)
        .stroke()
      }

      // Certificate Description - use custom description if provided, otherwise use default
      let descriptionText: string
      currentY += 40

      if (data.certificateDescription) {
        // Replace placeholders: [Student Name] and [Course Name]
        // Both placeholders will be rendered at 24pt Bold inline with the text
        // Supports: [student_name], [Student Name], [course_name], [Course Name], etc.
        // Case-insensitive, handles spaces, underscores, or no separator
        
        const courseNamePattern = /\[course[\s_]*name\]/gi
        const studentNamePattern = /\[student[\s_]*name\]/gi
        
        // Build array of text segments with formatting info
        const segments: Array<{ text: string; isPlaceholder: boolean; isStudent: boolean }> = []
        let remainingText = data.certificateDescription
        
        // Find all placeholder positions
        const placeholders: Array<{ index: number; type: 'student' | 'course'; length: number }> = []
        
        // Find student name placeholders
        let match
        const studentRegex = /\[student[\s_]*name\]/gi
        while ((match = studentRegex.exec(data.certificateDescription)) !== null) {
          placeholders.push({
            index: match.index,
            type: 'student',
            length: match[0].length
          })
        }
        
        // Find course name placeholders
        const courseRegex = /\[course[\s_]*name\]/gi
        while ((match = courseRegex.exec(data.certificateDescription)) !== null) {
          placeholders.push({
            index: match.index,
            type: 'course',
            length: match[0].length
          })
        }
        
        // Sort by index
        placeholders.sort((a, b) => a.index - b.index)
        
        // Build segments array
        let currentIndex = 0
        for (const placeholder of placeholders) {
          // Add text before placeholder
          if (placeholder.index > currentIndex) {
            const textBefore = data.certificateDescription.substring(currentIndex, placeholder.index)
            if (textBefore.trim().length > 0) {
              segments.push({
                text: textBefore,
                isPlaceholder: false,
                isStudent: false
              })
            }
          }
          
          // Add placeholder
          segments.push({
            text: placeholder.type === 'student' ? data.learnerName : data.courseTitle,
            isPlaceholder: true,
            isStudent: placeholder.type === 'student'
          })
          
          currentIndex = placeholder.index + placeholder.length
        }
        
        // Add remaining text
        if (currentIndex < data.certificateDescription.length) {
          const textAfter = data.certificateDescription.substring(currentIndex)
          if (textAfter.trim().length > 0) {
            segments.push({
              text: textAfter,
              isPlaceholder: false,
              isStudent: false
            })
          }
        }
        
        console.log("[PDF Generation] Certificate description processing:", {
          original: data.certificateDescription,
          segments,
          learnerName: data.learnerName,
          courseTitle: data.courseTitle,
        })
        
        // Render description with mixed formatting inline
        // Calculate positions to keep segments inline and centered
        const descY = yFromTop(currentY)
        const placeholderFontSize = 24
        const regularFontSize = 16
        const maxWidth = doc.page.width - 200
        const lineHeight = 28
        
        // Build lines of segments that fit within maxWidth
        const lines: Array<Array<{ text: string; isPlaceholder: boolean; width: number }>> = []
        let currentLine: Array<{ text: string; isPlaceholder: boolean; width: number }> = []
        let currentLineWidth = 0
        
        // Set up fonts for width calculation
        doc.fontSize(regularFontSize)
        doc.font(usePoppins ? "Poppins" : "Helvetica")
        
        for (const segment of segments) {
          // Set appropriate font for width calculation
          if (segment.isPlaceholder) {
            doc.fontSize(placeholderFontSize)
            doc.font(usePoppins ? "Poppins-Bold" : "Helvetica-Bold")
          } else {
            doc.fontSize(regularFontSize)
            doc.font(usePoppins ? "Poppins" : "Helvetica")
          }
          
          const segmentWidth = doc.widthOfString(segment.text)
          
          // Check if segment fits on current line
          if (currentLineWidth + segmentWidth <= maxWidth || currentLine.length === 0) {
            currentLine.push({ text: segment.text, isPlaceholder: segment.isPlaceholder, width: segmentWidth })
            currentLineWidth += segmentWidth
          } else {
            // Start new line
            lines.push(currentLine)
            currentLine = [{ text: segment.text, isPlaceholder: segment.isPlaceholder, width: segmentWidth }]
            currentLineWidth = segmentWidth
          }
        }
        
        // Add last line
        if (currentLine.length > 0) {
          lines.push(currentLine)
        }
        
        // Render lines
        let lineY = descY
        for (const line of lines) {
          // Calculate total width of line
          const totalLineWidth = line.reduce((sum, seg) => sum + seg.width, 0)
          
          // Start X position (centered)
          let currentX = pageCenterX - (totalLineWidth / 2)
          
          // Render each segment in the line
          for (const segment of line) {
            if (segment.isPlaceholder) {
              // Render placeholder (24pt Bold)
              doc.fontSize(placeholderFontSize)
              doc.font(usePoppins ? "Poppins-Bold" : "Helvetica-Bold")
              doc.fillColor("#2C3E50")
        } else {
              // Render regular text (16pt)
              doc.fontSize(regularFontSize)
              doc.font(usePoppins ? "Poppins" : "Helvetica")
              doc.fillColor("#34495E")
            }
            
            // Render segment at calculated X position
            doc.text(segment.text, currentX, lineY, {
              width: segment.width + 10, // Small buffer for spacing
            })
            
            // Move X position for next segment
            currentX += segment.width
          }
          
          // Move to next line
          lineY -= lineHeight
        }
        
        // Calculate total height used
        const totalHeight = lines.length * lineHeight
        currentY += totalHeight + 20
      } else {
        // Default description format
      // This is to certify that
        const certifyY = yFromTop(currentY)
      doc
        .fontSize(16)
        .fillColor("#34495E")
        .font(usePoppins ? "Poppins" : "Helvetica")
          .text("This is to certify that", pageCenterX, certifyY, {
          align: "center",
        })

        currentY += 30

      // Learner Name (prominent)
        const nameY = yFromTop(currentY)
        console.log("[PDF Generation] Rendering learner name (default format):", {
          name: data.learnerName,
          y: nameY,
          yFromTop: currentY,
        })
      doc
        .fontSize(32)
        .fillColor("#2C3E50")
          .font(usePoppins ? "Poppins-Bold" : "Helvetica-Bold")
          .text(data.learnerName, pageCenterX, nameY, {
          align: "center",
        })
        console.log("[PDF Generation] Learner name rendered successfully (default format)")

        currentY += 40

        // Has successfully completed/participated/achieved
        const getActionText = () => {
          switch (data.certificateType) {
            case "completion":
              return "completed"
            case "participation":
              return "participated in"
            case "achievement":
              return "achieved"
            default:
              return "completed"
          }
        }

        const actionY = yFromTop(currentY)
      doc
        .fontSize(16)
        .fillColor("#34495E")
        .font(usePoppins ? "Poppins" : "Helvetica")
        .text(
            `has successfully ${getActionText()}`,
            pageCenterX,
            actionY,
          {
            align: "center",
          }
        )

        currentY += 40
      }

      // Course Title
      const courseTitleY = yFromTop(currentY)
      doc
        .fontSize(24)
        .fillColor("#2C3E50")
        .font(usePoppins ? "Poppins-Bold" : "Helvetica-Bold")
        .text(data.courseTitle, pageCenterX, courseTitleY, {
          align: "center",
          width: doc.page.width - 200,
        })
      
      currentY += 50

      // Additional text (if provided)
      if (data.additionalText) {
        const additionalY = yFromTop(currentY)
        doc
          .fontSize(14)
          .fillColor("#34495E")
          .font(usePoppins ? "Poppins" : "Helvetica")
          .text(data.additionalText, pageCenterX, additionalY, {
            align: "center",
            width: doc.page.width - 200,
          })
        currentY += 30
      }

      // Date
      const issuedDate = new Date(data.issuedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      currentY += 20
      const dateY = yFromTop(currentY)
      doc
        .fontSize(14)
        .fillColor("#7F8C8D")
        .font(usePoppins ? "Poppins" : "Helvetica")
        .text(`Issued on ${issuedDate}`, pageCenterX, dateY, {
          align: "center",
        })

      // Signature section - centered under the issued date
      currentY += 40
      const signatureYFromTop = currentY
      const signatureY = yFromTop(signatureYFromTop)
      
      // Signature line (centered)
      if (signatureBuffer) {
        try {
          // Embed signature image
          // PDFKit: Y coordinate for images is the bottom of the image
          const signatureWidth = 80
          const signatureHeight = 30
          const sigImageY = pageHeight - (signatureYFromTop + signatureHeight)
          doc.image(signatureBuffer, pageCenterX - signatureWidth / 2, sigImageY, {
            width: signatureWidth,
            height: signatureHeight,
            fit: [signatureWidth, signatureHeight],
          })
        } catch (error) {
          console.warn("Failed to embed signature image, using line instead:", error)
          // Fallback to signature line
          doc
            .fontSize(12)
            .fillColor("#34495E")
            .font(usePoppins ? "Poppins" : "Helvetica")
            .text("_________________________", pageCenterX, signatureY, {
              align: "center",
            })
        }
      } else {
        // No signature image, use signature line
        doc
          .fontSize(12)
          .fillColor("#34495E")
          .font(usePoppins ? "Poppins" : "Helvetica")
          .text("_________________________", pageCenterX, signatureY, {
            align: "center",
          })
      }
      
      // Signature name and title (centered below signature line)
      currentY += 12
      
      // Render signature name and title separately for better spacing control
      const signatureTextY = yFromTop(currentY)
      
      if (data.signatureName && data.signatureTitle) {
        // Render name
        doc
          .fontSize(10)
          .fillColor("#7F8C8D")
          .font(usePoppins ? "Poppins" : "Helvetica")
          .text(data.signatureName, pageCenterX, signatureTextY, {
            align: "center",
            width: 200,
          })
        
        // Render title with tighter spacing (only 8pt gap instead of default line height)
        const titleY = yFromTop(currentY - 12)
        doc
          .fontSize(10)
          .fillColor("#7F8C8D")
          .font(usePoppins ? "Poppins" : "Helvetica")
          .text(data.signatureTitle, pageCenterX, titleY, {
            align: "center",
            width: 200,
          })
      } else if (data.signatureName) {
        doc
          .fontSize(10)
          .fillColor("#7F8C8D")
          .font(usePoppins ? "Poppins" : "Helvetica")
          .text(data.signatureName, pageCenterX, signatureTextY, {
            align: "center",
            width: 200,
          })
      } else if (data.signatureTitle) {
        doc
          .fontSize(10)
          .fillColor("#7F8C8D")
          .font(usePoppins ? "Poppins" : "Helvetica")
          .text(data.signatureTitle, pageCenterX, signatureTextY, {
            align: "center",
            width: 200,
          })
      } else {
        doc
          .fontSize(10)
          .fillColor("#7F8C8D")
          .font(usePoppins ? "Poppins" : "Helvetica")
          .text("Authorized Signature", pageCenterX, signatureTextY, {
            align: "center",
            width: 200,
          })
      }

      // Certificate Number (small, bottom)
      currentY += 50
      const certNumberY = yFromTop(currentY)
      doc
        .fontSize(10)
        .fillColor("#95A5A6")
        .font(usePoppins ? "Poppins" : "Helvetica")
        .text(
          `Certificate Number: ${data.certificateNumber}`,
          pageCenterX,
          certNumberY,
          {
          align: "center",
          }
        )

      // Final check - ensure we're still on the first page
      const finalPageNumber = doc.bufferedPageRange().start
      if (finalPageNumber !== 0) {
        console.error("[PDF Generation] ERROR: Certificate spans multiple pages! Page count:", doc.bufferedPageRange().count)
        console.error("[PDF Generation] This should not happen - certificate should be single page")
      } else {
        console.log("[PDF Generation] Certificate rendered successfully on single page")
      }

      doc.end()
    } catch (error: any) {
      // Provide more context for font loading errors
      if (error?.code === "ENOENT" && error?.path?.includes("pdfkit") && error?.path?.includes(".afm")) {
        const enhancedError = new Error(
          `PDFKit font file not found: ${error.path}. ` +
          `This is likely a deployment issue. PDFKit requires font files to be available. ` +
          `Ensure pdfkit font files (node_modules/pdfkit/js/data/*.afm) are included in your deployment. ` +
          `Original error: ${error.message}`
        )
        enhancedError.stack = error.stack
        reject(enhancedError)
      } else {
      reject(error)
      }
    }
  })
}

