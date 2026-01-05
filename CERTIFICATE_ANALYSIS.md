# Certificate Settings vs PDF Generation Analysis

## Certificate Settings Available in Course Builder

1. ✅ **certificateEnabled** - Toggle to enable/disable certificates
2. ✅ **certificateTemplate** - Upload template/background image (PNG, JPEG, PDF)
3. ✅ **certificateTitle** - Custom title (optional, overrides default)
4. ✅ **certificateType** - Dropdown: Completion, Participation, Achievement, or Custom
5. ✅ **certificateDescription** - Text with [student_name] placeholder
6. ✅ **signatureImage** - Upload signature image
7. ✅ **signatureTitle** - Text for signature (e.g., "Course Instructor")
8. ✅ **additionalText** - Additional text at bottom

## What's Used in PDF Generation

### ✅ USED (From Settings):
1. **certificateType** - Determines default title and action text
2. **certificateTitle** - Custom title (if provided, overrides default)
3. **certificateDescription** - Custom description with [student_name] replacement
4. **signatureImage** - Embedded in PDF at bottom left
5. **signatureTitle** - Displayed below signature (or "Authorized Signature" if not provided)
6. **additionalText** - Displayed after course title

### ❌ NOT USED (From Settings):
1. **certificateTemplate** - Uploaded and saved but NOT used in PDF generation!
   - The PDF uses a hardcoded cream/beige background (#FEF9E7)
   - Template image is completely ignored

### 🔧 HARDCODED (Not from Settings):
1. **logoUrl** - Hardcoded to: `https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Logo%20Bk.svg`
2. **organizationName** - Hardcoded to: `"Enthronement University"`
3. **Background Color** - Hardcoded to: `#FEF9E7` (light cream/beige)
4. **Border Style** - Hardcoded decorative borders
5. **Layout** - Hardcoded landscape LETTER size

### 📋 FROM DATABASE (Not from Settings):
1. **certificateNumber** - From `certificates.certificate_number`
2. **learnerName** - From `profiles.name` (replaces [student_name])
3. **courseTitle** - From `courses.title`
4. **issuedAt** - From `certificates.issued_at`

## What Will Be Generated

### Current PDF Structure:
```
┌─────────────────────────────────────┐
│         [LOGO - Hardcoded]          │
│    Enthronement University          │
│                                     │
│   Certificate of [Type/Title]       │
│         ───────────────             │
│                                     │
│  [Description or Default Text]      │
│         [LEARNER NAME]              │
│  has successfully [action]          │
│         [COURSE TITLE]              │
│                                     │
│      [Additional Text]              │
│                                     │
│      Issued on [Date]               │
│                                     │
│  [Signature Image]  [Signature Line]│
│  [Signature Title]  Date             │
│                                     │
│  Certificate Number: [Number]       │
└─────────────────────────────────────┘
```

## Issues Found

### 🚨 CRITICAL: Certificate Template Not Used
- **Problem**: Admin can upload a certificate template, but it's completely ignored
- **Impact**: Custom certificate designs cannot be used
- **Fix Needed**: PDF generator should use the template as background/image overlay

### ⚠️ HARDCODED VALUES
- Logo URL is hardcoded (should be configurable)
- Organization name is hardcoded (should be from settings or database)
- Background color is hardcoded (should use template or be configurable)

## Recommendations

### Must Fix:
1. **Use certificateTemplate in PDF generation**
   - If template is provided, use it as background
   - Overlay text on top of template
   - If no template, use current hardcoded design

### Should Fix:
2. **Make logo configurable**
   - Add logo upload to certificate settings
   - Or use organization settings logo

3. **Make organization name configurable**
   - Add to certificate settings or use organization settings

4. **Template usage options**
   - Option 1: Use template as full background (overlay text)
   - Option 2: Use template as watermark
   - Option 3: Use template as decorative border/header

## Current Flow

1. Admin uploads template → Saved to S3 → URL saved to `courses.certificate_template`
2. Admin enters description → Saved to `courses.certificate_description`
3. Admin uploads signature → Saved to S3 → URL saved to `courses.signature_image`
4. Certificate generated → **Template is ignored** → Uses hardcoded design
5. Description is used ✅
6. Signature is used ✅
