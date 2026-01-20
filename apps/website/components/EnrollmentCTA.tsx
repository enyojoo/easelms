"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Play, Eye } from "lucide-react"
import { Module } from "@/lib/types/course"
import { formatCurrency } from "@/lib/utils/currency"

interface EnrollmentCTAProps {
  course: Module
  variant?: "sidebar" | "card" | "inline"
  className?: string
}

export default function EnrollmentCTA({
  course,
  variant = "card",
  className = ""
}: EnrollmentCTAProps) {
  const [isRedirecting, setIsRedirecting] = useState(false)

  // You can use environment variables for the app URL
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.example.com"

  const enrollmentMode = course.settings?.enrollment?.enrollmentMode || "free"
  const coursePrice = course.price || course.settings?.enrollment?.price || 0

  // Mock user state - in a real app, this would come from auth context
  const isAuthenticated = false // This would be determined by your auth system
  const isEnrolled = false // This would be determined by checking enrollment status
  const isCompleted = false // This would be determined by checking completion status

  const getPriceDisplay = () => {
    if (enrollmentMode === "free") {
      return "Free"
    }
    if (enrollmentMode === "buy" && coursePrice > 0) {
      return formatCurrency(coursePrice, "USD")
    }
    return "Free"
  }

  const getButtonText = () => {
    if (isRedirecting) return "Redirecting..."

    if (isCompleted) return "View Certificate"
    if (isEnrolled) return "Continue Learning"
    if (enrollmentMode === "free") return "Enroll for Free"
    if (enrollmentMode === "buy") return "Buy Now"
    return "Get Started"
  }

  const getButtonIcon = () => {
    if (isCompleted) return <CheckCircle2 className="w-4 h-4 mr-2" />
    if (isEnrolled) return <Play className="w-4 h-4 mr-2" />
    return null
  }

  const getCTAAction = () => {
    setIsRedirecting(true)

    // Build the URL for LMS enrollment/signup
    const baseUrl = isAuthenticated
      ? `${APP_URL}/learner/courses/${course.id}` // Direct to course if already logged in
      : `${APP_URL}/auth/user/signup` // Sign up flow if not logged in

    const params = new URLSearchParams()
    params.append("course", course.id.toString())
    params.append("returnUrl", `/learner/courses/${course.id}`)

    const finalUrl = `${baseUrl}?${params.toString()}`

    // Redirect to LMS
    window.location.href = finalUrl
  }

  const getPreviewAction = () => {
    // For preview, we could show a modal or redirect to a preview page
    // For now, just redirect to course page
    window.location.href = `/courses/${course.id}`
  }

  const getCourseBadge = () => {
    if (isCompleted) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>
    }
    if (isEnrolled) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Enrolled</Badge>
    }
    switch (enrollmentMode) {
      case "free":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Free</Badge>
      case "buy":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Premium</Badge>
      case "recurring":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Subscription</Badge>
      default:
        return null
    }
  }

  if (variant === "card") {
    return (
      <div className={`p-6 border rounded-lg bg-card ${className}`}>
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-primary mb-1">{getPriceDisplay()}</div>
          {getCourseBadge()}
        </div>

        <div className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={getCTAAction}
            disabled={isRedirecting}
          >
            {getButtonIcon()}
            {getButtonText()}
          </Button>

          {!isEnrolled && !isCompleted && (
            <Button
              variant="outline"
              className="w-full"
              onClick={getPreviewAction}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Course
            </Button>
          )}

          {enrollmentMode !== "free" && (
            <p className="text-xs text-center text-muted-foreground">
              30-Day Money-Back Guarantee
            </p>
          )}
        </div>
      </div>
    )
  }

  if (variant === "sidebar") {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary mb-2">{getPriceDisplay()}</div>
          <div className="text-sm text-muted-foreground mb-4">One-time payment</div>
          {getCourseBadge()}
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={getCTAAction}
          disabled={isRedirecting}
        >
          {getButtonIcon()}
          {getButtonText()}
        </Button>

        {!isEnrolled && !isCompleted && (
          <Button
            variant="outline"
            className="w-full"
            onClick={getPreviewAction}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Course
          </Button>
        )}

        {enrollmentMode !== "free" && (
          <p className="text-xs text-center text-muted-foreground">
            30-Day Money-Back Guarantee
          </p>
        )}

        <div className="pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Full lifetime access</span>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex justify-between">
            <span>Certificate of completion</span>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex justify-between">
            <span>Mobile and desktop access</span>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
        </div>
      </div>
    )
  }

  // Inline variant for use in cards or other contexts
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="text-lg font-bold text-primary">{getPriceDisplay()}</div>
      {getCourseBadge()}
      <Button
        size="sm"
        onClick={getCTAAction}
        disabled={isRedirecting}
        className="ml-auto"
      >
        {getButtonIcon()}
        {getButtonText()}
      </Button>
    </div>
  )
}