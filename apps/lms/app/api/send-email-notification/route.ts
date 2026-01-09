/**
 * Email Notification API Endpoint
 * HTTP endpoint for triggering email notifications
 */

import { NextResponse } from "next/server"
import { emailNotificationService } from "@/lib/email/email-notification-service"
import { logError, logInfo } from "@/lib/utils/errorHandler"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, enrollmentId, certificateId, paymentId, userEmail, firstName, status } = body

    logInfo("Email notification request received", {
      component: "send-email-notification/route",
      action: "POST",
      type,
      enrollmentId,
      certificateId,
      paymentId,
    })

    // Validate request type
    if (!type) {
      return NextResponse.json(
        { error: "Type is required" },
        { status: 400 }
      )
    }

    // Handle different email types
    switch (type) {
      case "welcome":
        if (!userEmail || !firstName) {
          return NextResponse.json(
            { error: "userEmail and firstName are required for welcome email" },
            { status: 400 }
          )
        }
        // Send welcome email (non-blocking)
        emailNotificationService.sendWelcomeEmail(userEmail, firstName).catch((error) => {
          logError("Failed to send welcome email", error, {
            component: "send-email-notification/route",
            action: "welcome",
            userEmail,
          })
        })
        return NextResponse.json({ success: true, message: "Welcome email queued" })

      case "enrollment":
        if (!enrollmentId) {
          return NextResponse.json(
            { error: "enrollmentId is required for enrollment email" },
            { status: 400 }
          )
        }
        // Send enrollment email (non-blocking)
        emailNotificationService.sendEnrollmentEmail(enrollmentId).catch((error) => {
          logError("Failed to send enrollment email", error, {
            component: "send-email-notification/route",
            action: "enrollment",
            enrollmentId,
          })
        })
        // Also send admin notification (non-blocking)
        emailNotificationService.sendAdminNewEnrollmentNotification(enrollmentId).catch((error) => {
          logError("Failed to send admin enrollment notification", error, {
            component: "send-email-notification/route",
            action: "admin-enrollment",
            enrollmentId,
          })
        })
        return NextResponse.json({ success: true, message: "Enrollment email queued" })

      case "completion":
        if (!enrollmentId) {
          return NextResponse.json(
            { error: "enrollmentId is required for completion email" },
            { status: 400 }
          )
        }
        // Send completion email (non-blocking)
        emailNotificationService.sendCompletionEmail(enrollmentId).catch((error) => {
          logError("Failed to send completion email", error, {
            component: "send-email-notification/route",
            action: "completion",
            enrollmentId,
          })
        })
        return NextResponse.json({ success: true, message: "Completion email queued" })

      case "certificate":
        if (!certificateId) {
          return NextResponse.json(
            { error: "certificateId is required for certificate email" },
            { status: 400 }
          )
        }
        // Send certificate email (non-blocking)
        emailNotificationService.sendCertificateEmail(certificateId).catch((error) => {
          logError("Failed to send certificate email", error, {
            component: "send-email-notification/route",
            action: "certificate",
            certificateId,
          })
        })
        return NextResponse.json({ success: true, message: "Certificate email queued" })

      case "payment":
        if (!paymentId) {
          return NextResponse.json(
            { error: "paymentId is required for payment email" },
            { status: 400 }
          )
        }
        // Send payment email based on status (non-blocking)
        if (status === "failed") {
          emailNotificationService.sendPaymentFailedEmail(paymentId).catch((error) => {
            logError("Failed to send payment failed email", error, {
              component: "send-email-notification/route",
              action: "payment-failed",
              paymentId,
            })
          })
        } else {
          emailNotificationService.sendPaymentConfirmationEmail(paymentId).catch((error) => {
            logError("Failed to send payment confirmation email", error, {
              component: "send-email-notification/route",
              action: "payment-confirmation",
              paymentId,
            })
          })
          // Also send admin notification (non-blocking)
          emailNotificationService.sendAdminNewPaymentNotification(paymentId).catch((error) => {
            logError("Failed to send admin payment notification", error, {
              component: "send-email-notification/route",
              action: "admin-payment",
              paymentId,
            })
          })
        }
        return NextResponse.json({ success: true, message: "Payment email queued" })

      case "admin-enrollment":
        if (!enrollmentId) {
          return NextResponse.json(
            { error: "enrollmentId is required for admin enrollment notification" },
            { status: 400 }
          )
        }
        // Send admin enrollment notification (non-blocking)
        emailNotificationService.sendAdminNewEnrollmentNotification(enrollmentId).catch((error) => {
          logError("Failed to send admin enrollment notification", error, {
            component: "send-email-notification/route",
            action: "admin-enrollment",
            enrollmentId,
          })
        })
        return NextResponse.json({ success: true, message: "Admin enrollment notification queued" })

      case "admin-payment":
        if (!paymentId) {
          return NextResponse.json(
            { error: "paymentId is required for admin payment notification" },
            { status: 400 }
          )
        }
        // Send admin payment notification (non-blocking)
        emailNotificationService.sendAdminNewPaymentNotification(paymentId).catch((error) => {
          logError("Failed to send admin payment notification", error, {
            component: "send-email-notification/route",
            action: "admin-payment",
            paymentId,
          })
        })
        return NextResponse.json({ success: true, message: "Admin payment notification queued" })

      case "admin-completion":
        if (!enrollmentId) {
          return NextResponse.json(
            { error: "enrollmentId is required for admin completion notification" },
            { status: 400 }
          )
        }
        // Send admin completion notification (non-blocking)
        emailNotificationService.sendAdminCourseCompletionNotification(enrollmentId).catch((error) => {
          logError("Failed to send admin completion notification", error, {
            component: "send-email-notification/route",
            action: "admin-completion",
            enrollmentId,
          })
        })
        return NextResponse.json({ success: true, message: "Admin completion notification queued" })

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    logError("Error processing email notification request", error, {
      component: "send-email-notification/route",
      action: "POST",
      errorMessage: error?.message,
    })
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
