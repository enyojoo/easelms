// Import font patch before PDFKit to ensure fonts are patched
import "./pdfkit-font-patch"
import PDFDocument from "pdfkit"
import path from "path"
import fs from "fs"
import { renderCertificate, type CertificateData as RendererData, type CertificateAssets, type CertificateFonts } from "./certificate-renderer"

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
    // Next.js server build path
    path.join(process.cwd(), ".next/server/app/lib/certificates/fonts"),
    // Vercel serverless function path
    path.join("/var/task/apps/lms/lib/certificates/fonts"),
    path.join("/var/task/lib/certificates/fonts"),
    // Fallback to pdfkit's default fonts (for .afm files)
    path.join(process.cwd(), "node_modules/pdfkit/js/data"),
    // Monorepo structure
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
      console.log("[PDF Generation] Starting certificate generation with data:", {
        learnerName: data.learnerName,
        courseTitle: data.courseTitle,
        logoUrl: data.logoUrl,
        organizationName: data.organizationName,
        certificateDescription: data.certificateDescription,
      })

      // Verify fonts are available before initializing PDFDocument
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

      // Initialize PDFDocument - LETTER landscape, no margins (we handle spacing manually)
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      })
      
      // Prevent automatic page creation - we want everything on one page
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

      // Determine which fonts to use
      const usePoppins = poppinsRegular && poppinsBold
      const fonts: CertificateFonts = {
        regular: usePoppins ? "Poppins-Regular" : "Helvetica",
        bold: usePoppins ? "Poppins-Bold" : "Helvetica-Bold",
      }
      
      console.log("[PDF Generation] Using fonts:", fonts)

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

      // Fetch logo
      if (data.logoUrl && data.logoUrl.trim() !== "") {
        try {
          console.log("[PDF Generation] ===== LOGO FETCH START =====")
          console.log("[PDF Generation] Logo URL:", data.logoUrl)
          
          logoBuffer = await fetchImageBuffer(data.logoUrl)
          console.log("[PDF Generation] Logo fetched successfully, buffer size:", logoBuffer.length, "bytes")
          
          // Check if SVG (PDFKit doesn't support SVG)
          const isSVG = data.logoUrl.toLowerCase().endsWith('.svg') || 
                       logoBuffer.toString('utf8', 0, Math.min(100, logoBuffer.length)).includes('<svg')
          
          if (isSVG) {
            console.warn("[PDF Generation] Logo is SVG format - PDFKit doesn't support SVG")
            logoBuffer = null
          }
          
          console.log("[PDF Generation] ===== LOGO FETCH END =====")
        } catch (error) {
          console.error("[PDF Generation] Logo fetch failed:", error)
          logoBuffer = null
        }
      } else {
        console.log("[PDF Generation] No logo URL provided")
      }

      // Fetch signature
      if (data.signatureImage) {
        try {
          console.log("[PDF Generation] Fetching signature image:", data.signatureImage)
          signatureBuffer = await fetchImageBuffer(data.signatureImage)
          console.log("[PDF Generation] Signature fetched successfully, buffer size:", signatureBuffer.length, "bytes")
        } catch (error) {
          console.warn("[PDF Generation] Failed to fetch signature image:", error)
          signatureBuffer = null
        }
      }

      // Fetch template
      if (data.certificateTemplate) {
        try {
          console.log("[PDF Generation] Fetching template image:", data.certificateTemplate)
          templateBuffer = await fetchImageBuffer(data.certificateTemplate)
          console.log("[PDF Generation] Template fetched successfully, buffer size:", templateBuffer.length, "bytes")
        } catch (error) {
          console.warn("[PDF Generation] Failed to fetch certificate template image:", error)
          templateBuffer = null
        }
      }

      // Prepare certificate title
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

      // Prepare issued date
      const issuedDate = new Date(data.issuedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      // Prepare description template
      const descriptionTemplate = data.certificateDescription ||
        "This certifies that [Student Name] has successfully completed the [Course Name]."

      // Prepare renderer data
      const rendererData: RendererData = {
        title: getCertificateTitle(),
        studentName: data.learnerName,
        courseName: data.courseTitle,
        descriptionTemplate: descriptionTemplate,
        additionalText: data.additionalText,
        issuedOn: `Issued on ${issuedDate}`,
        signatureName: data.signatureName,
        signatureTitle: data.signatureTitle,
        certificateNumber: data.certificateNumber,
        organizationName: data.organizationName,
      }

      // Prepare assets
      const assets: CertificateAssets = {
        logo: logoBuffer,
        signature: signatureBuffer,
        template: templateBuffer,
      }

      console.log("[PDF Generation] Calling renderCertificate with:", {
        title: rendererData.title,
        studentName: rendererData.studentName,
        courseName: rendererData.courseName,
        hasLogo: !!assets.logo,
        hasSignature: !!assets.signature,
        hasTemplate: !!assets.template,
        fonts,
      })

      // Render the certificate using the flow layout renderer
      renderCertificate(doc, rendererData, assets, fonts, {
        debug: false, // Set to true to see debug overlay
        warnOnOverflow: true,
      })

      // Finalize the PDF
      doc.end()
      console.log("[PDF Generation] Certificate generation complete")

    } catch (error: any) {
      console.error("[PDF Generation] Error:", error)
      
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
