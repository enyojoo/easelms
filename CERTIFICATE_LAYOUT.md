# Certificate Layout - Visual Guide

## Page Specifications
- **Size**: Landscape LETTER (11" x 8.5" / 792 x 612 points)
- **Orientation**: Landscape (wider than tall)
- **Background**: Light cream (#FEF9E7) or custom template image
- **Borders**: Double border (outer: 3pt dark gray, inner: 1pt medium gray) - only if no template

---

## Flow Layout Implementation

The certificate uses a **flow layout** that stacks blocks from top to bottom using measured heights. No hardcoded absolute Y values beyond the top margin. Each block is centered horizontally using real font metrics.

### Layout Constants
- **TOP_MARGIN**: 60pt
- **BOTTOM_MARGIN**: 25pt
- **MAX_TEXT_WIDTH**: pageWidth - 200pt (592pt for LETTER landscape)

---

## Vertical Layout (Top to Bottom)

```
┌─────────────────────────────────────────────────────────┐
│                    TOP MARGIN (60pt)                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│              [LOGO] - fit within 120x40pt               │
│         (Organization logo from brand settings)          │
│              Centered horizontally                       │
│                                                          │
│                    +30pt spacing                        │
│                                                          │
│         CERTIFICATE TITLE (30pt, Bold, Black)           │
│    (Custom title OR "Certificate of Completion" etc.)    │
│              Centered horizontally                       │
│                                                          │
│                    +5pt spacing                         │
│                                                          │
│         ────────────────────────────────                 │
│         Decorative black line (300pt wide, #000000)     │
│         (Only if no custom template)                     │
│                                                          │
│                    +25pt spacing                        │
│                                                          │
│         CERTIFICATE DESCRIPTION                         │
│    (From course builder settings - custom text)          │
│    Base text: 16pt Regular, Color: #000000 (Black)      │
│    Placeholders: 16pt Bold, Color: #000000 (Black)      │
│    Supports [Student Name] and [Course Name]            │
│    Placeholders rendered INLINE with text               │
│    Baseline-aligned using nudge factor (0.65)           │
│    Line height: maxFontSize * 1.2                       │
│    Max width: pageWidth - 200pt                         │
│                                                          │
│                    +20pt spacing                        │
│                                                          │
│         ADDITIONAL TEXT (16pt, Optional)                │
│    (From course builder settings)                        │
│              Centered horizontally                       │
│                                                          │
│                    +20pt spacing                        │
│                                                          │
│         DATE (14pt, Gray #7F8C8D)                       │
│    "Issued on [Month Day, Year]"                        │
│              Centered horizontally                       │
│                                                          │
│                    +20pt spacing                        │
│                                                          │
│         [SIGNATURE IMAGE] (Optional)                    │
│         Fit within 180x50pt, centered                   │
│         +6pt spacing (if image present)                 │
│                                                          │
│         ────────────────────────────────                │
│         SIGNATURE LINE (220pt wide, ALWAYS present)     │
│         Color: #34495E, 1pt width                       │
│              Centered horizontally                       │
│                                                          │
│                    +12pt spacing                        │
│                                                          │
│         SIGNATURE NAME (16pt, Bold, Black)              │
│              Centered horizontally                       │
│                    +5pt spacing                         │
│         SIGNATURE TITLE (12pt, Regular, Gray #7F8C8D)   │
│              Centered horizontally                       │
│                                                          │
│                    +20pt spacing                        │
│                                                          │
│         CERTIFICATE NUMBER (10pt, Gray #95A5A6)         │
│    "Certificate Number: [number]"                       │
│              Centered horizontally                       │
│                                                          │
│                    BOTTOM MARGIN (25pt)                 │
└─────────────────────────────────────────────────────────┘
```

---

## Rich Text Description Implementation

The description paragraph supports **inline placeholders** with different font sizes:

### Placeholder Formats Supported
- `[Student Name]` / `[student_name]` / `[student name]`
- `[Course Name]` / `[course_name]` / `[course name]`

### Rendering Algorithm
1. **Parse template** into runs: `[{text, fontName, fontSize, color}]`
2. **Split runs into word tokens** (preserving spaces)
3. **Wrap lines** by accumulating run widths until maxWidth exceeded
4. **Center each line** by calculating: `x = (pageWidth - lineWidth) / 2`
5. **Baseline align** mixed font sizes: nudge smaller fonts down by `(maxFontSize - runFontSize) * 0.65`
6. **Line height**: `maxFontSize * 1.2`

### Example
```
Template: "This certifies that [Student Name] has completed the [Course Name]."

Runs:
- "This certifies that " (16pt, Regular, #34495E)
- "John Doe" (24pt, Bold, #2C3E50)
- " has completed the " (16pt, Regular, #34495E)
- "Web Development" (24pt, Bold, #2C3E50)
- "." (16pt, Regular, #34495E)
```

---

## Element Details

### 1. **Logo** (Top)
- **Fit box**: 120x40pt
- **Position**: Centered horizontally at top margin
- **Source**: Brand settings `logoBlack` (S3 URL)
- **Fallback**: None - logo area is skipped if no image available
- **Note**: SVG not supported by PDFKit - must use PNG/JPG

### 2. **Certificate Title**
- **Font**: 30pt Bold
- **Color**: #000000 (Black)
- **Position**: Centered, after logo + 30pt
- **Custom**: Can be set in course builder, or defaults based on type

### 3. **Decorative Line**
- **Width**: 300pt
- **Color**: #000000 (Black)
- **Thickness**: 2pt
- **Position**: Centered, after title + 5pt
- **Note**: Hidden if custom template is used

### 4. **Description Paragraph**
- **Base font**: 16pt Regular, #000000 (Black)
- **Placeholder font**: 16pt Bold, #000000 (Black)
- **Max width**: pageWidth - 200pt
- **Line height**: maxFontSize * 1.2
- **Baseline alignment**: Nudge factor 0.65
- **Position**: Centered, after decorative line + 20pt

### 5. **Additional Text** (Optional)
- **Font**: 16pt Regular
- **Color**: #000000 (Black)
- **Position**: Centered, after description + 20pt

### 6. **Date**
- **Font**: 14pt Regular
- **Color**: #7F8C8D (gray)
- **Format**: "Issued on January 8, 2026"
- **Position**: Centered, after additional text + 20pt

### 7. **Signature Area**
- **Signature Image** (Optional):
  - Fit box: 180x50pt
  - Centered horizontally
  - Source: Course builder settings (S3 URL)
- **Signature Line** (ALWAYS present):
  - Width: 220pt
  - Color: #34495E
  - Thickness: 1pt
  - Centered horizontally
- **Spacing**: +6pt between image and line (if image present)

### 8. **Signature Name & Title**
- **Signature Name**: 16pt Bold, Black (#000000)
- **Signature Title**: 12pt Regular, Gray (#7F8C8D)
- **Spacing**: 5pt between name and title
- **Fallback**: "Authorized Signature" (12pt, gray) if neither provided

### 9. **Certificate Number**
- **Font**: 10pt Regular
- **Color**: #95A5A6 (light gray)
- **Format**: "Certificate Number: [number]"
- **Position**: Centered, after signature section + 50pt

---

## Custom Template Support

If a custom certificate template image is provided:
- Template covers entire page (full background)
- Borders are hidden (template may have its own)
- Decorative blue line is hidden
- All text elements still render on top of template

---

## Debug Mode

The renderer supports a debug mode that draws:
- **Vertical center line** (x = pageWidth/2) in magenta
- **Content bounding box** for the maxWidth area

Enable with: `{ debug: true }` in render options

---

## Example Certificate Text Flow

**With Custom Description containing both placeholders:**
```
[LOGO]

Certificate of Completion
─────────────────────────

This certifies that John Doe has successfully 
completed the Introduction to Web Development, 
demonstrating commitment to personal growth 
and self-awareness.

[Additional Text - if provided]

Issued on January 15, 2024

[Signature Image - if provided]
─────────────────────────
    John Smith
    Director of Education

Certificate Number: CERT-12345
```

**Note**: In the example above:
- "John Doe" and "Introduction to Web Development" are rendered at **16pt Bold** (inline)
- Regular text is rendered at **16pt Regular**
- Signature line is **ALWAYS present** (centered)
- Signature name and title have **12pt spacing** between them

---

## Implementation Files

- `apps/lms/lib/certificates/certificate-renderer.ts` - Flow layout renderer
- `apps/lms/lib/certificates/generate-pdf.ts` - Main PDF generation entry point
- `apps/lms/lib/certificates/pdfkit-font-patch.ts` - Font loading patch for Vercel
