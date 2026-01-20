"use client"

import { useEffect, useState } from "react"
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

  // Get parameters from URL
  const paymentStatus = searchParams.get("status") // "success" or "error"
  const gateway = searchParams.get("gateway") // "stripe" or "flutterwave"
  const courseId = searchParams.get("courseId")
  const reason = searchParams.get("reason")

  // Prevent multiple payment processing - use sessionStorage to persist across remounts
  // Use a simple key based on URL to avoid initialization issues
  const sessionKey = `payment-processed-${courseId || 'unknown'}-${gateway || 'unknown'}-${paymentStatus || 'unknown'}`

  useEffect(() => {
    // Check if this payment has already been processed
    if (sessionStorage.getItem(sessionKey) === 'completed') {
      setStatus("success")
      return
    }

    // If no courseId, redirect to courses
    if (!courseId) {
      router.push("/learner/courses")
      return
    }

    // Ensure we have required parameters before processing
    if (!gateway || !paymentStatus) {
      return
    }

    // Handle payment error
    if (paymentStatus === "error") {
      setStatus("error")
      setError(reason || "Payment failed")
      return
    }

    // Handle payment success
    if (paymentStatus === "success" && gateway) {
      processPaymentSuccess()
    } else {
      router.push("/learner/courses")
    }
  }, [courseId, gateway, paymentStatus, sessionKey]) // Include dependencies

  // Cleanup sessionStorage on unmount
  useEffect(() => {
    return () => {
      // Clean up sessionStorage entry when component unmounts
      sessionStorage.removeItem(sessionKey)
    }
  }, [sessionKey])

  const processPaymentSuccess = async () => {
    // Prevent duplicate processing
    const currentStatus = sessionStorage.getItem(sessionKey)
    if (currentStatus === 'processing' || currentStatus === 'completed') {
      return
    }

    sessionStorage.setItem(sessionKey, 'processing')

    try {

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

      sessionStorage.setItem(sessionKey, 'completed')
      setStatus("success")
      toast.success("Payment successful! You are now enrolled in this course.")

    } catch (error: any) {
      console.error("Payment processing failed:", error)
      sessionStorage.setItem(sessionKey, 'error')
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