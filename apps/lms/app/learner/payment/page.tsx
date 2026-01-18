"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react"
import { createCourseSlug } from "@/lib/slug"
import { useEnrollCourse } from "@/lib/react-query/hooks/useEnrollments"
import { useClientAuthState } from "@/utils/client-auth"
import { toast } from "sonner"

type PaymentStatus = "processing" | "success" | "error"

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useClientAuthState()

  const [status, setStatus] = useState<PaymentStatus>("processing")
  const [course, setCourse] = useState<any>(null)
  const [error, setError] = useState<string>("")

  const enrollCourseMutation = useEnrollCourse()

  // Prevent multiple payment processing
  const processingStartedRef = useRef(false)
  const processingCompletedRef = useRef(false)
  const processingInProgressRef = useRef(false)

  // Get parameters from URL
  const paymentStatus = searchParams.get("status") // "success" or "error"
  const gateway = searchParams.get("gateway") // "stripe" or "flutterwave"
  const courseId = searchParams.get("courseId")
  const reason = searchParams.get("reason")

  useEffect(() => {
    console.log("Payment page useEffect running:", {
      processingStarted: processingStartedRef.current,
      authLoading,
      user: !!user,
      paymentStatus,
      gateway,
      courseId
    })

    // Prevent multiple processing
    if (processingStartedRef.current) {
      console.log("Processing already started, skipping")
      return
    }

    // Wait for auth to load
    if (authLoading) {
      console.log("Waiting for auth to load")
      return
    }

    // Redirect if not authenticated
    if (!user) {
      console.log("No user, redirecting to login")
      router.push("/auth/learner/login")
      return
    }

    // If no courseId, redirect to courses
    if (!courseId) {
      console.log("No courseId, redirecting to courses")
      router.push("/learner/courses")
      return
    }

    console.log("All checks passed, processing payment")

    // Mark as started to prevent any future runs
    processingStartedRef.current = true

    // Handle payment error
    if (paymentStatus === "error") {
      console.log("Setting error status")
      setStatus("error")
      setError(reason || "Payment failed")
      return
    }

    // Handle payment success
    if (paymentStatus === "success" && gateway) {
      console.log("Starting payment success processing for gateway:", gateway, "courseId:", courseId)
      processPaymentSuccess()
    } else {
      console.log("Invalid parameters - status:", paymentStatus, "gateway:", gateway, "courseId:", courseId, "redirecting to courses")
      router.push("/learner/courses")
    }
  }, []) // Empty dependency array - run only once on mount // Removed 'status' from deps to prevent re-runs

  const processPaymentSuccess = async () => {
    console.log("processPaymentSuccess called for gateway:", gateway)

    // Prevent duplicate processing
    if (processingCompletedRef.current || processingInProgressRef.current) {
      console.log("Payment processing already completed or in progress, skipping...")
      return
    }

    processingInProgressRef.current = true

    try {
      console.log("Processing payment success for course:", courseId, "gateway:", gateway)

      // First, fetch course details
      const courseResponse = await fetch(`/api/courses/${courseId}`)
      if (!courseResponse.ok) {
        throw new Error("Failed to fetch course details")
      }
      const courseData = await courseResponse.json()
      setCourse(courseData.course)

      // Handle enrollment (skip for Stripe - handled by webhook)
      if (gateway !== "stripe") {
        // Enroll the user for non-Stripe gateways (handle case where user is already enrolled)
        console.log("Enrolling user in course:", courseId)
        let enrollmentResult
        try {
          enrollmentResult = await enrollCourseMutation.mutateAsync({
            courseId: parseInt(courseId),
            bypassPrerequisites: true // Bypass prerequisites for paid courses
          })
          console.log("Enrollment created:", enrollmentResult)
        } catch (enrollmentError: any) {
          console.log("Enrollment error:", enrollmentError)
          // Check if user is already enrolled (any error containing "already enrolled")
          if (enrollmentError.message?.includes("already enrolled") ||
              enrollmentError.errorData?.error?.includes("already enrolled")) {
            console.log("User already enrolled in course, continuing...")
            enrollmentResult = { enrollment: enrollmentError.errorData?.enrollment }
          } else {
            throw enrollmentError
          }
        }
      } else {
        console.log("Skipping enrollment for Stripe - handled by webhook")
      }

      // For Stripe, everything is handled by webhook - just complete successfully
      if (gateway === "stripe") {
        console.log("Stripe payment processing completed - webhook handled everything")
      }

      // Create payment record (skip for Stripe - handled by webhook)
      let paymentData = null
      if (gateway === "stripe") {
        console.log("Skipping payment record creation for Stripe - handled by webhook")
        // For Stripe, payment record and email are handled by the webhook
        // We only need to handle enrollment here
      } else {
        // For Flutterwave and other gateways, create the payment record
        console.log("Creating payment record for", gateway)
        const paymentResponse = await fetch("/api/payments/record-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: courseId,
            userId: user?.id,
            amount: courseData.course?.price || 0,
            gateway: gateway
          })
        })

        if (!paymentResponse.ok) {
          const errorText = await paymentResponse.text()
          console.error("Failed to create payment record:", paymentResponse.status, errorText)
          // Don't fail the whole process for payment record issues
        } else {
          paymentData = await paymentResponse.json()
          console.log("Payment record created:", paymentData)

          // Send payment confirmation email
          if (paymentData.payment?.id) {
            try {
              const emailResponse = await fetch("/api/send-email-notification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "payment",
                  paymentId: paymentData.payment.id,
                  status: "completed",
                }),
              })
              if (!emailResponse.ok) {
                console.warn("Payment confirmation email failed to send")
              }
            } catch (emailError) {
              console.warn("Payment confirmation email error:", emailError)
            }
          }
        }
      }

      console.log("Payment processing completed successfully, setting status to success")
      processingCompletedRef.current = true
      processingInProgressRef.current = false
      setStatus("success")
      toast.success("Payment successful! You are now enrolled in this course.")
      console.log("Status set to success, UI should update")

    } catch (error: any) {
      console.error("Payment processing failed:", error)
      processingCompletedRef.current = true
      processingInProgressRef.current = false
      setStatus("error")
      setError(error.message || "Failed to process payment")
    }
  }

  const handleStartCourse = () => {
    if (course && courseId) {
      const courseSlug = createCourseSlug(course.title, parseInt(courseId))
      router.push(`/learner/courses/${courseSlug}/learn`)
    }
  }

  const handleTryAgain = () => {
    if (courseId) {
      const courseSlug = createCourseSlug(course?.title || "Course", parseInt(courseId))
      router.push(`/learner/courses/${courseSlug}`)
    } else {
      router.push("/learner/courses")
    }
  }

  // Show loading while processing
  if (status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Processing Payment</h2>
            <p className="text-muted-foreground">Please wait while we complete your enrollment...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show success state
  if (status === "success" && course) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You have been successfully enrolled in <strong>{course.title}</strong>
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                A confirmation email has been sent to your inbox with the course details.
              </p>
            </div>
            <Button onClick={handleStartCourse} className="w-full" size="lg">
              Start Learning Now
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-700">Payment Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {error || "There was an issue processing your payment."}
            </p>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-800">
                Please try again or contact support if the problem persists.
              </p>
            </div>
            <div className="space-y-2">
              <Button onClick={handleTryAgain} className="w-full" size="lg">
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/learner/courses")}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fallback loading state
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    </div>
  )
}