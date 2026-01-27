"use client"

import { cn } from "@/lib/utils"
import type React from "react"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "7xl" | "full"
  verticalPadding?: boolean
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
}

export default function PageContainer({
  children,
  className,
  maxWidth,
  verticalPadding = true,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        // Standardized horizontal padding: 16px mobile, 24px tablet, 32px desktop
        "px-4 md:px-6 lg:px-8",
        // Standardized vertical padding (optional)
        verticalPadding && "pt-4 md:pt-8 pb-4 md:pb-8",
        // Max width with auto margins for centering
        maxWidth && maxWidthClasses[maxWidth],
        maxWidth && "mx-auto",
        className
      )}
    >
      {children}
    </div>
  )
}
