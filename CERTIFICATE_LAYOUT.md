# Certificate Layout - Visual Guide

## Page Specifications
- **Size**: Landscape LETTER (11" x 8.5" / 792 x 612 points)
- **Orientation**: Landscape (wider than tall)
- **Background**: Light cream (#FEF9E7) or custom template image
- **Borders**: Double border (outer: 3pt dark gray, inner: 1pt medium gray)

---

## Vertical Layout (Top to Bottom)

```
┌─────────────────────────────────────────────────────────┐
│                    TOP MARGIN (60pt)                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│              [LOGO] - 120x40pt                          │
│         (Organization logo from brand settings)          │
│              Centered horizontally                       │
│                                                          │
│                    +30pt spacing                        │
│                                                          │
│         CERTIFICATE TITLE (36pt, Bold)                  │
│    (Custom title OR "Certificate of Completion" etc.)    │
│              Centered horizontally                       │
│                                                          │
│                    +60pt spacing                        │
│                                                          │
│         ────────────────────────────────                 │
│         Decorative blue line (300pt wide)               │
│                                                          │
│                    +40pt spacing                        │
│                                                          │
│         CERTIFICATE DESCRIPTION                         │
│    (From course builder settings - custom text)          │
│    Regular text: 16pt, Placeholders: 24pt Bold         │
│    Supports [Student Name] and [Course Name]            │
│    Placeholders rendered inline with text               │
│    Example: "This certifies that [Student Name]         │
│    has successfully completed the [Course Name]..."      │
│              Centered horizontally                       │
│         Max width: page width - 200pt                   │
│                                                          │
│                    +50pt spacing                        │
│                                                          │
│         ADDITIONAL TEXT (14pt)                          │
│    (Optional - from course builder settings)             │
│              Centered horizontally                       │
│         Max width: page width - 200pt                   │
│                                                          │
│                    +20pt spacing                        │
│                                                          │
│         DATE (14pt, Gray)                               │
│    "Issued on [Month Day, Year]"                        │
│              Centered horizontally                       │
│                                                          │
│                    +40pt spacing                        │
│                                                          │
│         ────────────────────────────────                │
│         SIGNATURE LINE (centered)                       │
│    (Signature image OR line)                            │
│              Centered horizontally                       │
│                                                          │
│                    +12pt spacing                        │
│                                                          │
│         SIGNATURE NAME & TITLE (10pt, Gray)             │
│    (From course builder settings)                        │
│    Name and Title with 12pt spacing (tight)             │
│              Centered horizontally                       │
│                                                          │
│                    +50pt spacing                        │
│                                                          │
│         CERTIFICATE NUMBER (10pt, Gray)                 │
│    "Certificate Number: [number]"                       │
│              Centered horizontally                       │
│                                                          │
│                    BOTTOM MARGIN                        │
└─────────────────────────────────────────────────────────┘
```

---

## Element Details

### 1. **Logo** (Top Center)
- **Position**: 60pt from top, horizontally centered
- **Size**: 120pt wide × 40pt tall
- **Source**: Organization logo from brand settings (logo_black)
- **Fallback**: Organization name text (24pt) if no logo

### 2. **Certificate Title**
- **Position**: ~130pt from top (after logo + spacing)
- **Font**: 36pt, Bold (Poppins-Bold or Helvetica-Bold)
- **Color**: Dark gray (#2C3E50)
- **Content**: 
  - Custom title from course builder settings, OR
  - Default: "Certificate of Completion/Participation/Achievement"

### 3. **Decorative Line**
- **Position**: ~190pt from top
- **Style**: 2pt blue line (#3498DB)
- **Width**: 300pt (centered)
- **Note**: Only shown if no custom template is used

### 4. **Certificate Description** (Custom from Course Builder)
- **Position**: ~230pt from top
- **Font**: Mixed formatting
  - Regular text: 16pt, Regular (Poppins/Helvetica)
  - Placeholders: 24pt, Bold (Poppins-Bold/Helvetica-Bold)
- **Color**: 
  - Regular text: Medium gray (#34495E)
  - Placeholders: Dark gray (#2C3E50)
- **Content**: Custom text from course builder settings
- **Placeholder Support**: 
  - `[Student Name]` or `[student_name]` → Replaced with learner's name (24pt Bold, inline)
  - `[Course Name]` or `[course_name]` → Replaced with course title (24pt Bold, inline)
  - Both placeholders render inline with the text, maintaining natural flow
  - Case-insensitive, supports spaces or underscores
- **Rendering**: Text flows naturally with placeholders rendered at 24pt Bold inline
- **Example**: "This certifies that **John Doe** has successfully completed the **Introduction to Web Development**, demonstrating commitment..."

### 5. **Additional Text** (Optional)
- **Position**: After course title
- **Font**: 14pt, Regular
- **Color**: Medium gray (#34495E)
- **Content**: Optional text from course builder settings
- **Max Width**: Page width - 200pt

### 6. **Date**
- **Position**: After additional text (or certificate description)
- **Font**: 14pt, Regular
- **Color**: Light gray (#7F8C8D)
- **Format**: "Issued on [Month Day, Year]" (e.g., "Issued on January 15, 2024")
- **Spacing**: 20pt after previous element

### 7. **Signature Section** (Centered under Date)
- **Position**: ~40pt after date
- **Layout**: Centered horizontally (no left/right split)
- **Signature Line**: 
  - Signature image (if provided) OR signature line
  - Centered under the issued date
- **Signature Name & Title**: 
  - Displayed below signature line (10pt, Gray)
  - **Spacing**: 12pt between signature line and name (tight, professional)
  - **Spacing**: 12pt between name and title (tight, professional spacing)
  - Centered horizontally
  - Format: Name on first line, Title on second line (12pt gap)
  - Falls back to "Authorized Signature" if neither provided

### 8. **Certificate Number** (Bottom)
- **Position**: ~50pt after signature section
- **Font**: 10pt, Regular
- **Color**: Light gray (#95A5A6)
- **Format**: "Certificate Number: [number]"
- **Note**: Decorative circle has been removed

---

## Horizontal Centering

All elements are **horizontally centered** using:
- `pageCenterX = pageWidth / 2` (396pt for LETTER landscape)
- Text uses `align: "center"` option
- Images positioned at `centerX - (width / 2)`

---

## Custom Template Support

If a custom certificate template image is provided:
- Template covers entire page (full background)
- Borders are hidden (template may have its own)
- Organization name is hidden (template may have branding)
- Decorative line is hidden
- All text elements still render on top of template

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

─────────────────────────
    John Smith
    Director of Education

Certificate Number: CERT-12345
```

**Note**: In the example above:
- "John Doe" and "Introduction to Web Development" are rendered at **24pt Bold** (inline)
- Regular text is rendered at **16pt Regular**
- Signature is **centered** under the date
- Signature name and title have **12pt spacing** between them (tight, professional)

**Note**: In the example above:
- "John Doe" and "Introduction to Web Development" are rendered at **24pt Bold** (inline)
- Regular text is rendered at **16pt Regular**
- Signature is **centered** under the date

---

## Settings from Course Builder

The following settings from the course builder affect the certificate:

1. **Certificate Title** → Overrides default title
2. **Certificate Description** → Custom text with `[Student Name]` and `[Course Name]` placeholders (both render at 24pt Bold inline)
3. **Additional Text** → Optional text displayed after certificate description
4. **Signature Image** → Image displayed centered under date (if provided)
5. **Signature Name** → Name displayed below signature line (centered)
6. **Signature Title** → Title displayed below signature name (centered)
7. **Certificate Template** → Background image (optional)

---

## Brand Settings Integration

- **Logo**: From brand settings → `logo_black` (for white/light backgrounds)
- **Organization Name**: From brand settings → `platform_name` (fallback if no logo)
