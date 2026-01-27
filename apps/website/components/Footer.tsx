"use client"

import Link from "next/link"
import Logo from "@/components/Logo"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useBrandSettings } from "@/lib/hooks/useBrandSettings"

export default function Footer() {
  const brandSettings = useBrandSettings()
  const platformName = brandSettings.platformName || "EaseLMS"

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <Logo className="w-32 md:w-44 mx-auto mb-4" />
          <p className="text-muted-foreground mb-6">
            Transform your life through knowledge with {platformName}. Access world-class courses designed to help you achieve your goals.
          </p>
          <div className="mb-6">
            <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            </div>
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {platformName}</p>
        </div>
      </div>
    </footer>
  )
}
