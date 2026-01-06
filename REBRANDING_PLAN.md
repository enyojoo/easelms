# EaseLMS Rebranding Plan

## Overview
This document outlines changes needed to rebrand **system-level/foundation** elements from "e-university" / "enthronement-university" to **EaseLMS**, while **keeping all organization-specific branding** (Enthronement University names, logos, support emails, etc.) unchanged.

### Strategy:
- **Open-Source Version**: Users fork from GitHub and customize as they wish
- **Hosted Version**: We fork the repo and customize for each organization:
  - Change organization name
  - Update logos
  - Setup their Supabase project
  - Setup their S3 bucket
  - Add Stripe configuration
  - Update environment variables
  - Customize domain settings (CNAME, etc.)

EaseLMS is the open-source product foundation. Licensed organizations like Enthronement University receive hosted versions with their own branding.

---

## Philosophy
- **Change:** System-level identifiers (package names, internal storage keys, build output)
- **Keep:** Organization-specific branding (UI text, logos, emails, copyright, certificates)

---

## Categories of Changes (System-Level Only)

### 1. Package Names & Build Configuration ✅ CHANGE

These appear in build output and identify the product itself, not the organization.

#### Files to Update:
- **`package.json`** (root)
  - Current: `"name": "elms-monorepo"`
  - Change to: `"name": "easelms-monorepo"`

- **`apps/website/package.json`**
  - Current: `"name": "enthronement-university-website"`
  - Change to: `"name": "easelms-website"`

- **`apps/lms/package.json`**
  - Current: `"name": "elms"`
  - Change to: `"name": "easelms"`

#### Impact:
- Build output will show "easelms-website" instead of "enthronement-university-website"
- Package references in node_modules and lock files
- This identifies the product, not the organization

---

### 2. Theme Storage Keys ✅ CHANGE

Internal browser storage keys that identify the system, not user-facing.

#### Files to Update:

**`apps/lms/app/layout.tsx`**
- Line 40: `const storageKey = 'enthronement-university-theme';`
  - Change to: `const storageKey = 'easelms-theme';`

**`apps/lms/components/ClientLayout.tsx`**
- Line 258: `storageKey="enthronement-university-theme"`
  - Change to: `storageKey="easelms-theme"`

#### Impact:
- Users with existing theme preferences will reset (acceptable for system rebrand)
- This is an internal system identifier

---

## What We're NOT Changing (Organization Branding)

These remain as Enthronement University branding for their hosted instance:

### ❌ Application Metadata & Titles
- **`apps/lms/app/layout.tsx`** - Title stays: "Enthronement University - Learning Management System"
- **`apps/website/app/layout.tsx`** - Title stays: "Enthronement University - Learn. Grow. Succeed."
- **`apps/website/app/page.tsx`** - Copyright stays: "© 2025 Enthronement University. All rights reserved."

### ❌ Logo & Branding Components
- **`apps/lms/components/Logo.tsx`** - Alt text stays: "Enthronement University Logo"
- **`apps/website/components/Logo.tsx`** - Alt text stays: "Enthronement University Logo"
- **All logo URLs** - Stay pointing to EUNI logos (organization's branding)

### ❌ Footer & Copyright Text
- **`apps/lms/components/LeftSidebar.tsx`** - Copyright stays: "© {year} Enthronement University"

### ❌ Support & Contact Information
- **`apps/lms/app/learner/support/page.tsx`** - Email stays: `support@enthronementuniversity.com`

### ❌ Certificate Generation
- **`apps/lms/app/api/certificates/[id]/download/route.ts`** - Organization name stays: "Enthronement University"
- Logo URL stays pointing to EUNI logo

### ❌ Custom Domain Settings
- **`apps/lms/app/admin/settings/components/CustomDomainSettings.tsx`** - CNAME stays: `cname.enthronement-university.com`
  - **Note:** This will be customized per organization in their hosted fork (not changed in base repo)

### ❌ Course Data
- **`apps/lms/data/courses.ts`** - Sample courses with "Enthronement Bible Institute" stay as-is

---

## Files Summary

### Files Requiring Changes (System-Level Only):
1. ✅ `package.json` (root) - Package name
2. ✅ `apps/website/package.json` - Package name
3. ✅ `apps/lms/package.json` - Package name
4. ✅ `apps/lms/app/layout.tsx` - Theme storage key
5. ✅ `apps/lms/components/ClientLayout.tsx` - Theme storage key

### Total Files: 5

---

## Implementation Plan

### Step 1: Update Package Names
1. Update root `package.json`
2. Update `apps/website/package.json`
3. Update `apps/lms/package.json`
4. Run `npm install` to update lock files

### Step 2: Update Theme Storage Keys
1. Update `apps/lms/app/layout.tsx`
2. Update `apps/lms/components/ClientLayout.tsx`

### Step 3: Verify
1. Run build to confirm package names changed in output
2. Test theme switching works with new storage key
3. Verify organization branding still displays correctly

---

## Expected Results

### Build Output (Before):
```
• Packages in scope: elms, enthronement-university-website
enthronement-university-website:build: > enthronement-university-website@0.1.0 build
```

### Build Output (After):
```
• Packages in scope: easelms, easelms-website
easelms-website:build: > easelms-website@0.1.0 build
```

### User Experience:
- ✅ All UI still shows "Enthronement University"
- ✅ Logos still show Enthronement University branding
- ✅ Support email still shows organization email
- ✅ Certificates still show organization name
- ✅ Theme preferences reset (acceptable for system rebrand)

---

## Notes

- **Organization Branding Preserved:** All user-facing branding remains as Enthronement University
- **System Identity Changed:** Internal system identifiers now reflect EaseLMS as the product
- **Theme Reset:** Users will need to reset theme preferences (one-time, acceptable)
- **Build Identity:** Build output will identify the product as EaseLMS, not the organization
- **Customization Strategy:** 
  - Open-source users: Fork and customize everything themselves
  - Hosted clients: We fork and customize org name, logos, Supabase, S3, Stripe, env vars, and domain settings per organization

---

## Next Steps

1. ✅ Review and approve this focused plan
2. Execute changes to 5 files
3. Run build to verify changes
4. Test theme functionality
5. Confirm organization branding still displays correctly
