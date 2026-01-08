/**
 * Certificate Renderer - Flow Layout Implementation
 * 
 * PDFKit flow-layout certificate renderer (top-to-bottom, centered)
 * Uses measured heights and proper font metrics for accurate positioning
 */

import PDFDocument from "pdfkit"

// Snap to 0.5pt grid to reduce drift
const roundPt = (v: number) => Math.round(v * 2) / 2

// ---------- Types ----------
interface CertificateData {
  title: string
  studentName: string
  courseName: string
  descriptionTemplate: string
  additionalText?: string
  issuedOn: string
  signatureName?: string
  signatureTitle?: string
  certificateNumber: string
  organizationName?: string
}

interface CertificateAssets {
  logo?: Buffer | null
  signature?: Buffer | null
  template?: Buffer | null
  logoOffsetX?: number
  signatureOffsetX?: number
}

interface CertificateFonts {
  regular: string
  bold: string
}

interface RenderOptions {
  debug?: boolean
  warnOnOverflow?: boolean
}

interface TextRun {
  text: string
  fontName: string
  fontSize: number
  color: string
}

interface LayoutLine {
  runs: TextRun[]
  width: number
}

// ---------- Debug overlay ----------
function drawDebug(doc: typeof PDFDocument.prototype, topMargin: number, bottomMargin: number, maxWidth: number) {
  doc.save()
  doc.strokeColor("#FF00FF").lineWidth(0.5)

  // vertical center line
  doc.moveTo(doc.page.width / 2, 0).lineTo(doc.page.width / 2, doc.page.height).stroke()

  // content box (maxWidth)
  const x = (doc.page.width - maxWidth) / 2
  const h = doc.page.height - topMargin - bottomMargin
  doc.rect(x, topMargin, maxWidth, h).stroke()

  doc.restore()
}

// ---------- Primitive blocks ----------
function drawCenteredLine(
  doc: typeof PDFDocument.prototype, 
  y: number, 
  width: number, 
  opts: { strokeColor?: string; lineWidth?: number } = {}
): number {
  const x = roundPt((doc.page.width - width) / 2)
  doc.save()
  if (opts.strokeColor) doc.strokeColor(opts.strokeColor)
  if (opts.lineWidth) doc.lineWidth(opts.lineWidth)
  doc.moveTo(x, y).lineTo(x + width, y).stroke()
  doc.restore()
  return 0 // no height contribution
}

function drawCenteredImageFit(
  doc: typeof PDFDocument.prototype, 
  imageBuffer: Buffer, 
  y: number, 
  fitW: number, 
  fitH: number, 
  opts: { offsetX?: number; offsetY?: number } = {}
): number {
  const x = roundPt((doc.page.width - fitW) / 2) + (opts.offsetX ?? 0)
  const yy = roundPt(y + (opts.offsetY ?? 0))
  doc.image(imageBuffer, x, yy, { fit: [fitW, fitH], align: "center", valign: "top" })
  return fitH
}

function drawCenteredWrappedText(
  doc: typeof PDFDocument.prototype, 
  text: string, 
  y: number, 
  maxWidth: number, 
  fontName: string, 
  fontSize: number, 
  opts: { color?: string; lineGap?: number } = {}
): number {
  const x = roundPt((doc.page.width - maxWidth) / 2)
  doc.save()
  if (opts.color) doc.fillColor(opts.color)
  doc.font(fontName).fontSize(fontSize)

  doc.text(text, x, roundPt(y), {
    width: maxWidth,
    align: "center",
    lineGap: opts.lineGap ?? 0,
  })

  const h = doc.heightOfString(text, { width: maxWidth, lineGap: opts.lineGap ?? 0 })
  doc.restore()
  return h
}

// ---------- Rich paragraph (inline placeholders) ----------
function explodeRunsToTokens(runs: TextRun[]): TextRun[] {
  // split into words/spaces tokens so wrapping is natural
  const out: TextRun[] = []
  for (const r of runs) {
    const parts = String(r.text).split(/(\s+)/) // keep spaces as tokens
    for (const p of parts) {
      if (p === "") continue
      out.push({ ...r, text: p })
    }
  }
  return out
}

function measureRunWidth(doc: typeof PDFDocument.prototype, run: TextRun): number {
  doc.save()
  doc.font(run.fontName).fontSize(run.fontSize)
  const w = doc.widthOfString(run.text)
  doc.restore()
  return w
}

function layoutRichLines(doc: typeof PDFDocument.prototype, runs: TextRun[], maxWidth: number): LayoutLine[] {
  const tokens = explodeRunsToTokens(runs)

  const lines: LayoutLine[] = []
  let line: TextRun[] = []
  let lineW = 0

  for (const t of tokens) {
    const w = measureRunWidth(doc, t)

    if (line.length === 0) {
      line.push(t)
      lineW = w
      continue
    }

    if (lineW + w <= maxWidth) {
      line.push(t)
      lineW += w
    } else {
      lines.push({ runs: line, width: lineW })
      line = [t]
      lineW = w
    }
  }

  if (line.length) lines.push({ runs: line, width: lineW })
  return lines
}

function drawRichParagraphCentered(
  doc: typeof PDFDocument.prototype, 
  runs: TextRun[], 
  y: number, 
  maxWidth: number, 
  opts: { lineHeightFactor?: number; baselineNudgeFactor?: number } = {}
): { height: number; linesCount: number } {
  const lines = layoutRichLines(doc, runs, maxWidth)

  const lineHeightFactor = opts.lineHeightFactor ?? 1.2
  const baselineNudgeFactor = opts.baselineNudgeFactor ?? 0.65

  let totalH = 0

  for (const line of lines) {
    const maxSize = Math.max(...line.runs.map((r) => r.fontSize))
    const lineHeight = maxSize * lineHeightFactor

    const startX = roundPt((doc.page.width - line.width) / 2)
    const lineTopY = roundPt(y + totalH)

    let x = startX
    for (const r of line.runs) {
      // "Optical baseline" alignment: nudge smaller fonts downward a bit
      const dy = (maxSize - r.fontSize) * baselineNudgeFactor

      doc.save()
      if (r.color) doc.fillColor(r.color)
      doc.font(r.fontName).fontSize(r.fontSize)

      // Render run (no line break)
      doc.text(r.text, roundPt(x), roundPt(lineTopY + dy), { lineBreak: false })

      // Advance x by exact measured width in same font/size
      const w = doc.widthOfString(r.text)
      doc.restore()

      x += w
    }

    totalH += lineHeight
  }

  return { height: totalH, linesCount: lines.length }
}

// ---------- Template -> runs ----------
function buildDescriptionRuns(
  template: string, 
  studentName: string, 
  courseName: string, 
  fonts: CertificateFonts
): TextRun[] {
  // Normalize placeholders - support various formats
  const normalized = String(template)
    .replace(/\[student[\s_]*name\]/gi, "{{STUDENT}}")
    .replace(/\[course[\s_]*name\]/gi, "{{COURSE}}")

  const parts = normalized.split(/(\{\{STUDENT\}\}|\{\{COURSE\}\})/)

  const runs: TextRun[] = []
  for (const p of parts) {
    if (!p) continue

    if (p === "{{STUDENT}}") {
      // Placeholder: 16pt Bold (same size as regular text, but bold) - BLACK
      runs.push({ text: studentName, fontName: fonts.bold, fontSize: 16, color: "#000000" })
    } else if (p === "{{COURSE}}") {
      // Placeholder: 16pt Bold (same size as regular text, but bold) - BLACK
      runs.push({ text: courseName, fontName: fonts.bold, fontSize: 16, color: "#000000" })
    } else {
      // Regular text - BLACK
      runs.push({ text: p, fontName: fonts.regular, fontSize: 16, color: "#000000" })
    }
  }
  return runs
}

// ---------- Main renderer ----------
export function renderCertificate(
  doc: typeof PDFDocument.prototype, 
  data: CertificateData, 
  assets: CertificateAssets, 
  fonts: CertificateFonts, 
  options: RenderOptions = {}
): void {
  // Layout constants from spec
  const TOP_MARGIN = 60
  const BOTTOM_MARGIN = 60

  const LOGO_W = 120
  const LOGO_H = 40

  const TITLE_SIZE = 30 // Reduced from 36pt to 30pt

  const LINE_W = 300
  const LINE_COLOR = "#000000" // Black

  const MAX_TEXT_WIDTH = doc.page.width - 200

  const ADDITIONAL_SIZE = 16
  const DATE_SIZE = 14
  const SMALL_GRAY_SIZE = 10
  const GRAY = "#7F8C8D"

  const SIGNATURE_IMG_W = 180
  const SIGNATURE_IMG_H = 50
  const SIGNATURE_LINE_W = 220

  // Optional optical offsets
  const logoOffsetX = assets?.logoOffsetX ?? 0
  const sigOffsetX = assets?.signatureOffsetX ?? 0

  // Draw background first
  if (assets?.template) {
    try {
      doc.image(assets.template, 0, 0, {
        width: doc.page.width,
        height: doc.page.height,
        fit: [doc.page.width, doc.page.height],
      })
    } catch (error) {
      console.error("[Certificate Renderer] Failed to render template background:", error)
      // Fallback to hardcoded background
      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#FEF9E7")
    }
  } else {
    // Hardcoded background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#FEF9E7")
    
    // Borders
    doc.lineWidth(3).strokeColor("#2C3E50")
      .rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke()
    
    doc.lineWidth(1).strokeColor("#7F8C8D")
      .rect(50, 50, doc.page.width - 100, doc.page.height - 100).stroke()
  }

  if (options.debug) drawDebug(doc, TOP_MARGIN, BOTTOM_MARGIN, MAX_TEXT_WIDTH)

  let y = TOP_MARGIN

  // LOGO - MUST use image, not organization name
  if (assets?.logo) {
    try {
      y += drawCenteredImageFit(doc, assets.logo, y, LOGO_W, LOGO_H, { offsetX: logoOffsetX })
      y += 30
      console.log("[Certificate Renderer] Logo rendered, y now:", y)
    } catch (error) {
      console.error("[Certificate Renderer] Failed to render logo:", error)
      // Skip logo area if image fails - do NOT show organization name
      y += LOGO_H + 30
    }
  } else {
    // No logo provided - skip logo area entirely
    // Do NOT show organization name as fallback
    console.log("[Certificate Renderer] No logo provided, skipping logo area")
    y += LOGO_H + 30
  }

  // TITLE - BLACK
  y += drawCenteredWrappedText(
    doc,
    data.title || "Certificate of Completion",
    y,
    MAX_TEXT_WIDTH,
    fonts.bold,
    TITLE_SIZE,
    { color: "#000000" }
  )
  y += 5 // Reduced from 60pt to 5pt to fit content on page
  console.log("[Certificate Renderer] Title rendered, y now:", y)

  // DECORATIVE LINE (black) - only if no template
  if (!assets?.template) {
    drawCenteredLine(doc, y, LINE_W, { strokeColor: LINE_COLOR, lineWidth: 2 })
  }
  y += 25 // Spacing after line

  // DESCRIPTION (rich runs: 16pt + 24pt bold placeholders)
  const descriptionTemplate = data.descriptionTemplate ||
    "This certifies that [Student Name] has successfully completed the [Course Name]."

  const runs = buildDescriptionRuns(
    descriptionTemplate,
    data.studentName || "Student Name",
    data.courseName || "Course Name",
    fonts
  )

  const desc = drawRichParagraphCentered(doc, runs, y, MAX_TEXT_WIDTH, {
    lineHeightFactor: 1.2,
    baselineNudgeFactor: 0.65,
  })
  y += desc.height + 20 // Reduced from 30pt to 20pt
  console.log("[Certificate Renderer] Description rendered, lines:", desc.linesCount, ", y now:", y)

  // ADDITIONAL TEXT (optional) - BLACK
  if (data.additionalText && String(data.additionalText).trim()) {
    y += drawCenteredWrappedText(
      doc,
      data.additionalText,
      y,
      MAX_TEXT_WIDTH,
      fonts.regular,
      ADDITIONAL_SIZE,
      { color: "#000000" }
    )
    y += 20
  }

  // DATE (gray)
  y += drawCenteredWrappedText(
    doc,
    data.issuedOn || "Issued on January 8, 2026",
    y,
    MAX_TEXT_WIDTH,
    fonts.regular,
    DATE_SIZE,
    { color: GRAY }
  )
  y += 20 // Reduced from 25pt to 20pt (before signature)
  console.log("[Certificate Renderer] Date rendered, y now:", y)

  // SIGNATURE AREA:
  // - signature image (optional, centered)
  // - signature line (ALWAYS, centered)
  if (assets?.signature) {
    try {
      y += drawCenteredImageFit(doc, assets.signature, y, SIGNATURE_IMG_W, SIGNATURE_IMG_H, {
        offsetX: sigOffsetX,
      })
      y += 6 // small gap between image and line
      console.log("[Certificate Renderer] Signature image rendered, y now:", y)
    } catch (error) {
      console.error("[Certificate Renderer] Failed to render signature image:", error)
    }
  }

  // SIGNATURE LINE (ALWAYS present) - BLACK
  drawCenteredLine(doc, y, SIGNATURE_LINE_W, { strokeColor: "#000000", lineWidth: 1 })
  y += 12
  console.log("[Certificate Renderer] Signature line rendered, y now:", y)

  // SIGNATURE NAME (16pt bold) - BLACK & TITLE (12pt regular) - GRAY
  if (data.signatureName) {
    y += drawCenteredWrappedText(
      doc,
      data.signatureName,
      y,
      MAX_TEXT_WIDTH,
      fonts.bold, // Bold for name
      16, // 16pt font size
      { color: "#000000" } // BLACK for name
    )
    y += 5 // Gap between name and title
  }
  
  if (data.signatureTitle) {
    y += drawCenteredWrappedText(
      doc,
      data.signatureTitle,
      y,
      MAX_TEXT_WIDTH,
      fonts.regular, // Regular for title
      12, // 12pt font size
      { color: GRAY } // GRAY for title
    )
  } else if (!data.signatureName) {
    // Fallback if neither name nor title
    y += drawCenteredWrappedText(
      doc,
      "Authorized Signature",
      y,
      MAX_TEXT_WIDTH,
      fonts.regular,
      12,
      { color: GRAY }
    )
  }
  y += 10 // Reduced from 20pt to 10pt

  // CERTIFICATE NUMBER (8pt gray)
  drawCenteredWrappedText(
    doc,
    `Certificate Number: ${data.certificateNumber}`,
    y,
    MAX_TEXT_WIDTH,
    fonts.regular,
    8, // 8pt font size
    { color: "#95A5A6" }
  )
  console.log("[Certificate Renderer] Certificate number rendered, y now:", y)

  // Bottom margin guard
  const overflow = y - (doc.page.height - BOTTOM_MARGIN)
  if (overflow > 0 && options.warnOnOverflow) {
    console.warn("[Certificate Renderer] Content overflowed bottom margin by", overflow, "pt")
  }

  console.log("[Certificate Renderer] Certificate rendering complete")
}

export type { CertificateData, CertificateAssets, CertificateFonts, RenderOptions }
