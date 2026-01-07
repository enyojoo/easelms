"use client"

import { useEffect, useRef, useLayoutEffect } from "react"
import { usePathname } from "next/navigation"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"

/**
 * Get page name from pathname for immediate title setting
 */
function getPageNameFromPath(pathname: string): string {
  // Course pages - will be handled separately with course title
  if (pathname.match(/\/courses\/\d+/)) {
    return "" // Will be set by course layout metadata
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
  
  return routeMap[pathname] || ""
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
      // Set title synchronously - don't wait for anything
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
        // For course pages or unknown routes, try to read from HTML head
        // Next.js should have set it via generateMetadata
        const metaTitle = document.querySelector('title')
        if (metaTitle && metaTitle.textContent) {
          const serverTitle = metaTitle.textContent.trim()
          if (serverTitle && serverTitle !== lastTitleRef.current) {
            document.title = serverTitle
            lastTitleRef.current = serverTitle
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
