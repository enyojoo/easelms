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

  // Get parameters from URL
  const paymentStatus = searchParams.get("status") // "success" or "error"
  const gateway = searchParams.get("gateway") // "stripe" or "flutterwave"
  const courseId = searchParams.get("courseId")
  const reason = searchParams.get("reason")

  useEffect(() => {
    // Prevent multiple processing
    if (processingStartedRef.current) {
      console.log("Payment processing already started, skipping...")
      return
    }

    // Redirect if not authenticated
    if (!authLoading && !user) {
      router.push("/auth/learner/login")
      return
    }

    // If user is still loading, wait
    if (authLoading || !user) return

    // If no courseId, redirect to courses
    if (!courseId) {
      router.push("/learner/courses")
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
      processingStartedRef.current = true
      processPaymentSuccess()
    } else {
      router.push("/learner/courses")
    }
  }, [authLoading, user, paymentStatus, gateway, courseId, reason])

  const processPaymentSuccess = async () => {
    // Double-check processing hasn't started elsewhere
    if (processingStartedRef.current && status !== "processing") {
      console.log("Payment processing already completed, skipping...")
      return
    }

    try {
      console.log("Processing payment success for course:", courseId, "gateway:", gateway)

      // First, fetch course details
      const courseResponse = await fetch(`/api/courses/${courseId}`)
      if (!courseResponse.ok) {
        throw new Error("Failed to fetch course details")
      }
      const courseData = await courseResponse.json()
      setCourse(courseData.course)

      // Enroll the user (handle case where user is already enrolled)
      console.log("Enrolling user in course:", courseId)
      let enrollmentResult
      try {
        enrollmentResult = await enrollCourseMutation.mutateAsync(parseInt(courseId))
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

      // Create payment record
      console.log("Creating payment record")
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
        const paymentData = await paymentResponse.json()
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

      setStatus("success")
      toast.success("Payment successful! You are now enrolled in this course.")

    } catch (error: any) {
      console.error("Payment processing failed:", error)
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