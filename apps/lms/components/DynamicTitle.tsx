"use client"

import { useEffect, useRef, useLayoutEffect } from "react"
import { usePathname } from "next/navigation"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"

/**
 * Get page name from pathname for immediate title setting
 */
function getPageNameFromPath(pathname: string): string | null {
  // Course detail pages - these will be handled by layout metadata with course title
  // Return null so we read from HTML head instead
  if (pathname.match(/\/courses\/[^/]+$/)) {
    return null // Will be set by course layout metadata
  }
  
  // Course learn pages - also handled by layout
  if (pathname.match(/\/courses\/[^/]+\/learn/)) {
    return null // Will be set by course layout metadata
  }
  
  // Map common routes to page names
  const routeMap: Record<string, string> = {
    "/learner/dashboard": "Dashboard",
    "/learner/courses": "Courses",
    "/learner/profile": "Profile",
    "/learner/purchase": "Purchase",
    "/learner/support": "Support",
    "/admin/dashboard": "Admin Dashboard",
    "/admin/courses": "Manage Courses",
    "/admin/courses/new": "New Course",
    "/admin/profile": "Admin Profile",
    "/admin/learners": "Learners",
    "/admin/settings": "Settings",
    "/admin/purchases": "Purchases",
    "/auth/admin/login": "Admin Login",
    "/auth/learner/login": "Login",
    "/auth/learner/signup": "Sign Up",
    "/forgot-password": "Forgot Password",
    "/forgot-password/code": "Reset Password",
    "/forgot-password/new-password": "New Password",
  }
  
  // Check exact match first
  if (routeMap[pathname]) {
    return routeMap[pathname]
  }
  
  // Check for admin learner detail pages
  if (pathname.match(/^\/admin\/learners\/[^/]+$/)) {
    return "Learner Details"
  }
  
  // Check for course preview pages
  if (pathname.match(/^\/admin\/courses\/preview\/[^/]+$/)) {
    return null // Will be set by layout metadata
  }
  
  // Check for course preview-learn pages
  if (pathname.match(/^\/admin\/courses\/[^/]+\/preview-learn$/)) {
    return null // Will be set by layout metadata
  }
  
  // Check for admin course learn pages
  if (pathname.match(/^\/admin\/courses\/[^/]+\/learn$/)) {
    return null // Will be set by layout metadata
  }
  
  // Check for course summary pages
  if (pathname.match(/\/courses\/[^/]+\/learn\/summary$/)) {
    return null // Will be set by layout metadata
  }
  
  // Unknown route - return null to read from HTML head
  return null
}

/**
 * Client-side component that updates the browser title immediately on navigation
 * Sets title synchronously to prevent domain URL flicker
 * Uses page name + platform name format
 */
export default function DynamicTitle() {
  const pathname = usePathname()
  const brandSettings = useBrandSettings()
  const lastTitleRef = useRef<string>("")
  const lastPathnameRef = useRef<string>("")

  // Use useLayoutEffect for synchronous title update (runs before paint)
  // This sets title immediately on navigation to prevent domain URL flicker
  useLayoutEffect(() => {
    if (typeof document === "undefined") return

    // On pathname change, set title immediately to prevent flicker
    if (pathname !== lastPathnameRef.current) {
      // Check if title is already set by layout script tag (for auth pages, etc.)
      // Script tags run synchronously before React, so title should already be set
      const currentTitle = document.title
      const metaTitle = document.querySelector('title')
      const htmlTitle = metaTitle?.textContent?.trim() || ""
      
      // If title is already set and looks correct (contains " - "), use it
      // This handles auth pages where script tags set the title immediately
      if (currentTitle && currentTitle.includes(" - ") && currentTitle !== lastTitleRef.current) {
        // Title already set by script tag, just track it
        lastTitleRef.current = currentTitle
        lastPathnameRef.current = pathname
        return
      }
      
      // If HTML head has a valid title, use it
      if (htmlTitle && htmlTitle.includes(" - ") && htmlTitle !== lastTitleRef.current) {
        document.title = htmlTitle
        lastTitleRef.current = htmlTitle
        lastPathnameRef.current = pathname
        return
      }
      
      // If no server title yet or it's the default, set title based on pathname
      // This prevents showing domain URL
      const pageName = getPageNameFromPath(pathname)
      if (pageName) {
        // Get platform name - use cached value if available, otherwise use placeholder
        const platformName = (brandSettings.hasData && brandSettings.platformName) 
          ? brandSettings.platformName 
          : (brandSettings.platformName || "Platform")
        
        const newTitle = `${pageName} - ${platformName}`
        
        // Set title immediately - this prevents domain URL from showing
        if (newTitle !== lastTitleRef.current) {
          document.title = newTitle
          lastTitleRef.current = newTitle
        }
      } else {
        // For course pages or routes without mapping, try HTML head again
        // or set a generic title to prevent domain URL flash
        if (htmlTitle && htmlTitle !== lastTitleRef.current) {
          document.title = htmlTitle
          lastTitleRef.current = htmlTitle
        } else {
          // Last resort: set generic title to prevent domain URL
          const platformName = brandSettings.platformName || "Platform"
          const fallbackTitle = `Page - ${platformName}`
          if (fallbackTitle !== lastTitleRef.current) {
            document.title = fallbackTitle
            lastTitleRef.current = fallbackTitle
          }
        }
      }
      
      lastPathnameRef.current = pathname
    }
  }, [pathname, brandSettings.platformName, brandSettings.hasData])

  // Update title once brand settings are confirmed
  useEffect(() => {
    if (typeof document === "undefined") return
    if (brandSettings.isLoading || !brandSettings.hasData) return

    // Read current title - if it's a temporary one, update with confirmed platform name
    const currentTitle = document.title
    const pageName = getPageNameFromPath(pathname)
    
    if (pageName) {
      const platformName = brandSettings.platformName || "EaseLMS"
      const correctTitle = `${pageName} - ${platformName}`
      
      // Only update if title doesn't match the correct format
      if (currentTitle !== correctTitle && !currentTitle.includes(" - ")) {
        document.title = correctTitle
        lastTitleRef.current = correctTitle
      }
    }
  }, [pathname, brandSettings.platformName, brandSettings.hasData, brandSettings.isLoading])

  return null
}
