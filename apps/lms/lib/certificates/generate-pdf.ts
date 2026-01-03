import PDFDocument from "pdfkit"
import { Readable } from "stream"

interface CertificateData {
  certificateNumber: string
  learnerName: string
  courseTitle: string
  issuedAt: string
  certificateType: "completion" | "participation"
  organizationName?: string
  logoUrl?: string // URL to platform logo (black version for white background)
  signatureImage?: string // URL to signature image (S3 URL)
  signatureTitle?: string // Title for signature (e.g., "Director of Education")
  additionalText?: string // Additional text to display on certificate
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
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      })

      const buffers: Buffer[] = []
      doc.on("data", buffers.push.bind(buffers))
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on("error", reject)

      // Fetch logo and signature images asynchronously
      let logoBuffer: Buffer | null = null
      let signatureBuffer: Buffer | null = null

      try {
        if (data.logoUrl) {
          logoBuffer = await fetchImageBuffer(data.logoUrl)
        }
      } catch (error) {
        console.warn("Failed to fetch logo image:", error)
      }

      try {
        if (data.signatureImage) {
          signatureBuffer = await fetchImageBuffer(data.signatureImage)
        }
      } catch (error) {
        console.warn("Failed to fetch signature image:", error)
      }

      // Background color (light cream/beige)
      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#FEF9E7")

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

      // Header - Logo and Organization Name
      let headerY = 80
      
      // Add logo (if available) - top left or center top
      if (logoBuffer) {
        try {
          // Place logo at top center, above organization name
          const logoWidth = 120
          const logoHeight = 40
          doc.image(logoBuffer, (doc.page.width - logoWidth) / 2, 40, {
            width: logoWidth,
            height: logoHeight,
            fit: [logoWidth, logoHeight],
            align: "center",
          })
          headerY = 90 // Adjust header position if logo is present
        } catch (error) {
          console.warn("Failed to embed logo in PDF:", error)
        }
      }

      // Organization Name (if provided) - below logo
      if (data.organizationName) {
        doc
          .fontSize(24)
          .fillColor("#2C3E50")
          .font("Helvetica-Bold")
          .text(data.organizationName, doc.page.width / 2, headerY, {
            align: "center",
          })
      }

      // Title - Certificate of Completion/Participation
      doc
        .fontSize(36)
        .fillColor("#2C3E50")
        .font("Helvetica-Bold")
        .text(
          `Certificate of ${data.certificateType === "completion" ? "Completion" : "Participation"}`,
          doc.page.width / 2,
          data.organizationName ? 130 : 100,
          {
            align: "center",
          }
        )

      // Decorative line
      doc
        .lineWidth(2)
        .strokeColor("#3498DB")
        .moveTo(doc.page.width / 2 - 150, 180)
        .lineTo(doc.page.width / 2 + 150, 180)
        .stroke()

      // This is to certify that
      doc
        .fontSize(16)
        .fillColor("#34495E")
        .font("Helvetica")
        .text("This is to certify that", doc.page.width / 2, 220, {
          align: "center",
        })

      // Learner Name (prominent)
      doc
        .fontSize(32)
        .fillColor("#2C3E50")
        .font("Helvetica-Bold")
        .text(data.learnerName, doc.page.width / 2, 260, {
          align: "center",
        })

      // Has successfully completed/participated
      doc
        .fontSize(16)
        .fillColor("#34495E")
        .font("Helvetica")
        .text(
          `has successfully ${data.certificateType === "completion" ? "completed" : "participated in"}`,
          doc.page.width / 2,
          320,
          {
            align: "center",
          }
        )

      // Course Title
      doc
        .fontSize(24)
        .fillColor("#2C3E50")
        .font("Helvetica-Bold")
        .text(data.courseTitle, doc.page.width / 2, 360, {
          align: "center",
          width: doc.page.width - 200,
        })

      // Additional text (if provided)
      let currentY = 420
      if (data.additionalText) {
        doc
          .fontSize(14)
          .fillColor("#34495E")
          .font("Helvetica")
          .text(data.additionalText, doc.page.width / 2, currentY, {
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

      doc
        .fontSize(14)
        .fillColor("#7F8C8D")
        .font("Helvetica")
        .text(`Issued on ${issuedDate}`, doc.page.width / 2, currentY, {
          align: "center",
        })

      // Certificate Number (small, bottom)
      doc
        .fontSize(10)
        .fillColor("#95A5A6")
        .font("Helvetica")
        .text(
          `Certificate Number: ${data.certificateNumber}`,
          doc.page.width / 2,
          doc.page.height - 80,
          {
            align: "center",
          }
        )

      // Signature section
      const signatureY = doc.page.height - 120
      const signatureXLeft = doc.page.width / 2 - 100
      const signatureXRight = doc.page.width / 2 + 100
      
      // Left signature (signature image or line)
      if (signatureBuffer) {
        try {
          // Embed signature image
          const signatureWidth = 80
          const signatureHeight = 30
          doc.image(signatureBuffer, signatureXLeft - signatureWidth / 2, signatureY - 5, {
            width: signatureWidth,
            height: signatureHeight,
            fit: [signatureWidth, signatureHeight],
            align: "center",
          })
        } catch (error) {
          console.warn("Failed to embed signature image, using line instead:", error)
          // Fallback to signature line
          doc
            .fontSize(12)
            .fillColor("#34495E")
            .font("Helvetica")
            .text("_________________________", signatureXLeft, signatureY, {
              align: "center",
            })
        }
      } else {
        // No signature image, use signature line
        doc
          .fontSize(12)
          .fillColor("#34495E")
          .font("Helvetica")
          .text("_________________________", signatureXLeft, signatureY, {
            align: "center",
          })
      }
      
      // Right signature line (for date)
      doc
        .fontSize(12)
        .fillColor("#34495E")
        .font("Helvetica")
        .text("_________________________", signatureXRight, signatureY, {
          align: "center",
        })

      // Signature title (if provided) or default text
      const signatureLabel = data.signatureTitle || "Authorized Signature"
      doc
        .fontSize(10)
        .fillColor("#7F8C8D")
        .font("Helvetica")
        .text(signatureLabel, signatureXLeft, signatureY + 25, {
          align: "center",
        })
        .text("Date", signatureXRight, signatureY + 25, {
          align: "center",
        })

      // Footer decorative element
      doc
        .circle(doc.page.width / 2, doc.page.height - 40, 20)
        .lineWidth(1)
        .strokeColor("#BDC3C7")
        .stroke()

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

