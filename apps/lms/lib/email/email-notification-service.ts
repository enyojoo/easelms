/**
 * Email Notification Service
 * Business logic layer for sending email notifications
 * Fetches data from database and prepares email data
 */

import { createServiceRoleClient } from "../supabase/server"
import { emailService } from "./email-service"
import { logError, logInfo, logWarning } from "../utils/errorHandler"

class EmailNotificationService {
  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(userEmail: string, firstName: string): Promise<void> {
    try {
      logInfo("Sending welcome email", {
        component: "email-notification-service",
        action: "sendWelcomeEmail",
        userEmail,
      })

      // Fetch user data from database
      const supabase = createServiceRoleClient()
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("email", userEmail)
        .single()

      if (profileError || !profile) {
        logError("Failed to fetch user profile for welcome email", profileError, {
          component: "email-notification-service",
          action: "sendWelcomeEmail",
          userEmail,
        })
        return
      }

      // Split name into first and last
      const nameParts = (profile.name || firstName || "").split(" ")
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""

      await emailService.sendWelcomeEmail({
        userEmail: profile.email,
        firstName: nameParts[0] || firstName,
        lastName,
      })

      logInfo("Welcome email sent successfully", {
        component: "email-notification-service",
        action: "sendWelcomeEmail",
        userEmail,
      })
    } catch (error) {
      logError("Error sending welcome email", error, {
        component: "email-notification-service",
        action: "sendWelcomeEmail",
        userEmail,
      })
      // Don't throw - email failures shouldn't break user registration
    }
  }

  /**
   * Send enrollment confirmation email
   */
  async sendEnrollmentEmail(enrollmentId: string): Promise<void> {
    try {
      logInfo("Sending enrollment email", {
        component: "email-notification-service",
        action: "sendEnrollmentEmail",
        enrollmentId,
      })

      const supabase = createServiceRoleClient()

      // Fetch enrollment with related data
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select(
          `
          id,
          enrolled_at,
          user_id,
          course_id,
          profiles:user_id (
            id,
            name,
            email
          ),
          courses:course_id (
            id,
            title,
            description,
            image
          )
        `
        )
        .eq("id", enrollmentId)
        .single()

      if (enrollmentError || !enrollment) {
        logError("Failed to fetch enrollment data", enrollmentError, {
          component: "email-notification-service",
          action: "sendEnrollmentEmail",
          enrollmentId,
        })
        return
      }

      const profile = enrollment.profiles as any
      const course = enrollment.courses as any

      if (!profile || !course) {
        logError("Missing profile or course data for enrollment email", null, {
          component: "email-notification-service",
          action: "sendEnrollmentEmail",
          enrollmentId,
        })
        return
      }

      // Split name into first and last
      const nameParts = (profile.name || "").split(" ")
      const firstName = nameParts[0] || "Student"
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""

      await emailService.sendEnrollmentEmail({
        userEmail: profile.email,
        firstName,
        lastName,
        courseName: course.title,
        courseDescription: course.description,
        courseImage: course.image,
        courseId: course.id,
        enrolledAt: enrollment.enrolled_at || new Date().toISOString(),
      })

      logInfo("Enrollment email sent successfully", {
        component: "email-notification-service",
        action: "sendEnrollmentEmail",
        enrollmentId,
      })
    } catch (error) {
      logError("Error sending enrollment email", error, {
        component: "email-notification-service",
        action: "sendEnrollmentEmail",
        enrollmentId,
      })
      // Don't throw - email failures shouldn't break enrollment
    }
  }

  /**
   * Send course completion notification email
   */
  async sendCompletionEmail(enrollmentId: string): Promise<void> {
    try {
      logInfo("Sending completion email", {
        component: "email-notification-service",
        action: "sendCompletionEmail",
        enrollmentId,
      })

      const supabase = createServiceRoleClient()

      // Fetch enrollment with related data
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select(
          `
          id,
          completed_at,
          user_id,
          course_id,
          profiles:user_id (
            id,
            name,
            email
          ),
          courses:course_id (
            id,
            title,
            certificate_enabled
          )
        `
        )
        .eq("id", enrollmentId)
        .single()

      if (enrollmentError || !enrollment) {
        logError("Failed to fetch enrollment data for completion email", enrollmentError, {
          component: "email-notification-service",
          action: "sendCompletionEmail",
          enrollmentId,
        })
        return
      }

      const profile = enrollment.profiles as any
      const course = enrollment.courses as any

      if (!profile || !course) {
        logError("Missing profile or course data for completion email", null, {
          component: "email-notification-service",
          action: "sendCompletionEmail",
          enrollmentId,
        })
        return
      }

      // Check if certificate exists
      let certificateId: string | undefined
      let certificateUrl: string | undefined

      if (course.certificate_enabled) {
        const { data: certificate } = await supabase
          .from("certificates")
          .select("id, certificate_number, s3_url")
          .eq("user_id", profile.id)
          .eq("course_id", course.id)
          .single()

        if (certificate) {
          certificateId = certificate.id
          certificateUrl = certificate.s3_url
        }
      }

      // Split name into first and last
      const nameParts = (profile.name || "").split(" ")
      const firstName = nameParts[0] || "Student"
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""

      await emailService.sendCompletionEmail({
        userEmail: profile.email,
        firstName,
        lastName,
        courseName: course.title,
        courseId: course.id,
        completedAt: enrollment.completed_at || new Date().toISOString(),
        certificateEnabled: course.certificate_enabled || false,
        certificateId,
        certificateUrl,
      })

      logInfo("Completion email sent successfully", {
        component: "email-notification-service",
        action: "sendCompletionEmail",
        enrollmentId,
      })
    } catch (error) {
      logError("Error sending completion email", error, {
        component: "email-notification-service",
        action: "sendCompletionEmail",
        enrollmentId,
      })
      // Don't throw - email failures shouldn't break completion
    }
  }

  /**
   * Send admin notification for course completion
   */
  async sendAdminCourseCompletionNotification(enrollmentId: string): Promise<void> {
    try {
      logInfo("Sending admin course completion notification", {
        component: "email-notification-service",
        action: "sendAdminCourseCompletionNotification",
        enrollmentId,
      })

      const supabase = createServiceRoleClient()

      // Fetch enrollment with related data
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select(
          `
          id,
          completed_at,
          user_id,
          course_id,
          profiles:user_id (
            id,
            name,
            email
          ),
          courses:course_id (
            id,
            title
          )
        `
        )
        .eq("id", enrollmentId)
        .single()

      if (enrollmentError || !enrollment) {
        logError("Failed to fetch enrollment data for admin completion notification", enrollmentError, {
          component: "email-notification-service",
          action: "sendAdminCourseCompletionNotification",
          enrollmentId,
        })
        return
      }

      const profile = enrollment.profiles as any
      const course = enrollment.courses as any

      if (!profile || !course) {
        logError("Missing profile or course data for admin completion notification", null, {
          component: "email-notification-service",
          action: "sendAdminCourseCompletionNotification",
          enrollmentId,
        })
        return
      }

      // Fetch admin emails
      const { data: admins } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_type", "admin")

      if (!admins || admins.length === 0) {
        logWarning("No admin users found for completion notification", {
          component: "email-notification-service",
          action: "sendAdminCourseCompletionNotification",
          enrollmentId,
        })
        return
      }

      // Send notification to all admins
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"
      const adminDashboardUrl = new URL("/admin", appUrl).toString()

      for (const admin of admins) {
        await emailService.sendAdminNotificationEmail({
          adminEmail: admin.email,
          type: "completion",
          userName: profile.name || profile.email,
          userEmail: profile.email,
          courseName: course.title,
          courseId: course.id,
          enrollmentDate: enrollment.completed_at || new Date().toISOString(),
        })
      }

      logInfo("Admin course completion notification sent successfully", {
        component: "email-notification-service",
        action: "sendAdminCourseCompletionNotification",
        enrollmentId,
        adminCount: admins.length,
      })
    } catch (error) {
      logError("Error sending admin course completion notification", error, {
        component: "email-notification-service",
        action: "sendAdminCourseCompletionNotification",
        enrollmentId,
      })
      // Don't throw - email failures shouldn't break completion
    }
  }

  /**
   * Send certificate ready notification email
   */
  async sendCertificateEmail(certificateId: string): Promise<void> {
    try {
      logInfo("Sending certificate email", {
        component: "email-notification-service",
        action: "sendCertificateEmail",
        certificateId,
      })

      const supabase = createServiceRoleClient()

      // Convert certificateId to number if it's a string (database stores IDs as integers)
      const certificateIdNum = typeof certificateId === 'string' ? parseInt(certificateId, 10) : certificateId
      
      if (isNaN(certificateIdNum)) {
        logError("Invalid certificate ID format", new Error("Invalid certificate ID"), {
          component: "email-notification-service",
          action: "sendCertificateEmail",
          certificateId,
        })
        return
      }

      // Fetch certificate with related data
      const { data: certificate, error: certificateError } = await supabase
        .from("certificates")
        .select(
          `
          id,
          certificate_number,
          issued_at,
          s3_url,
          user_id,
          course_id,
          profiles:user_id (
            id,
            name,
            email
          ),
          courses:course_id (
            id,
            title
          )
        `
        )
        .eq("id", certificateIdNum)
        .maybeSingle()

      if (certificateError) {
        logError("Failed to fetch certificate data", certificateError, {
          component: "email-notification-service",
          action: "sendCertificateEmail",
          certificateId,
          certificateIdNum,
        })
        return
      }
      
      if (!certificate) {
        logWarning("Certificate not found for email", {
          component: "email-notification-service",
          action: "sendCertificateEmail",
          certificateId,
          certificateIdNum,
        })
        return
      }

      const profile = certificate.profiles as any
      const course = certificate.courses as any

      if (!profile || !course) {
        logError("Missing profile or course data for certificate email", null, {
          component: "email-notification-service",
          action: "sendCertificateEmail",
          certificateId,
        })
        return
      }

      // Split name into first and last
      const nameParts = (profile.name || "").split(" ")
      const firstName = nameParts[0] || "Student"
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"
      const certificateUrl = certificate.s3_url || new URL(`/api/certificates/${certificateId}/download`, appUrl).toString()

      await emailService.sendCertificateEmail({
        userEmail: profile.email,
        firstName,
        lastName,
        courseName: course.title,
        certificateNumber: certificate.certificate_number,
        issuedAt: certificate.issued_at || new Date().toISOString(),
        certificateUrl,
      })

      logInfo("Certificate email sent successfully", {
        component: "email-notification-service",
        action: "sendCertificateEmail",
        certificateId,
      })
    } catch (error) {
      logError("Error sending certificate email", error, {
        component: "email-notification-service",
        action: "sendCertificateEmail",
        certificateId,
      })
      // Don't throw - email failures shouldn't break certificate generation
    }
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(paymentId: string): Promise<void> {
    try {
      logInfo("Sending payment confirmation email", {
        component: "email-notification-service",
        action: "sendPaymentConfirmationEmail",
        paymentId,
      })

      const supabase = createServiceRoleClient()

      // Fetch payment with related data
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select(
          `
          id,
          transaction_id,
          payment_amount,
          payment_currency,
          payment_method,
          completed_at,
          status,
          user_id,
          course_id,
          profiles:user_id (
            id,
            name,
            email
          ),
          courses:course_id (
            id,
            title
          )
        `
        )
        .eq("id", paymentId)
        .single()

      if (paymentError || !payment) {
        logError("Failed to fetch payment data", paymentError, {
          component: "email-notification-service",
          action: "sendPaymentConfirmationEmail",
          paymentId,
        })
        return
      }

      const profile = payment.profiles as any
      const course = payment.courses as any

      if (!profile || !course) {
        logError("Missing profile or course data for payment email", null, {
          component: "email-notification-service",
          action: "sendPaymentConfirmationEmail",
          paymentId,
        })
        return
      }

      // Split name into first and last
      const nameParts = (profile.name || "").split(" ")
      const firstName = nameParts[0] || "Student"
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""

      await emailService.sendPaymentEmail({
        userEmail: profile.email,
        firstName,
        lastName,
        transactionId: payment.transaction_id || payment.id,
        amount: parseFloat(payment.payment_amount?.toString() || payment.amount?.toString() || "0"),
        currency: payment.payment_currency || payment.currency || "USD",
        courseName: course.title,
        courseId: course.id,
        paymentMethod: payment.payment_method || "card",
        completedAt: payment.completed_at || new Date().toISOString(),
        status: payment.status === "completed" ? "completed" : "failed",
      })

      logInfo("Payment confirmation email sent successfully", {
        component: "email-notification-service",
        action: "sendPaymentConfirmationEmail",
        paymentId,
      })
    } catch (error) {
      logError("Error sending payment confirmation email", error, {
        component: "email-notification-service",
        action: "sendPaymentConfirmationEmail",
        paymentId,
      })
      // Don't throw - email failures shouldn't break payment processing
    }
  }

  /**
   * Send payment failed email
   */
  async sendPaymentFailedEmail(paymentId: string, failureReason?: string): Promise<void> {
    try {
      logInfo("Sending payment failed email", {
        component: "email-notification-service",
        action: "sendPaymentFailedEmail",
        paymentId,
      })

      const supabase = createServiceRoleClient()

      // Fetch payment with related data
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select(
          `
          id,
          transaction_id,
          payment_amount,
          payment_currency,
          payment_method,
          completed_at,
          status,
          user_id,
          course_id,
          profiles:user_id (
            id,
            name,
            email
          ),
          courses:course_id (
            id,
            title
          )
        `
        )
        .eq("id", paymentId)
        .single()

      if (paymentError || !payment) {
        logError("Failed to fetch payment data for failed email", paymentError, {
          component: "email-notification-service",
          action: "sendPaymentFailedEmail",
          paymentId,
        })
        return
      }

      const profile = payment.profiles as any
      const course = payment.courses as any

      if (!profile || !course) {
        logError("Missing profile or course data for payment failed email", null, {
          component: "email-notification-service",
          action: "sendPaymentFailedEmail",
          paymentId,
        })
        return
      }

      // Split name into first and last
      const nameParts = (profile.name || "").split(" ")
      const firstName = nameParts[0] || "Student"
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""

      await emailService.sendPaymentEmail({
        userEmail: profile.email,
        firstName,
        lastName,
        transactionId: payment.transaction_id || payment.id,
        amount: parseFloat(payment.payment_amount?.toString() || payment.amount?.toString() || "0"),
        currency: payment.payment_currency || payment.currency || "USD",
        courseName: course.title,
        courseId: course.id,
        paymentMethod: payment.payment_method || "card",
        completedAt: payment.completed_at || new Date().toISOString(),
        status: "failed",
        failureReason: failureReason || "Payment could not be processed",
      })

      logInfo("Payment failed email sent successfully", {
        component: "email-notification-service",
        action: "sendPaymentFailedEmail",
        paymentId,
      })
    } catch (error) {
      logError("Error sending payment failed email", error, {
        component: "email-notification-service",
        action: "sendPaymentFailedEmail",
        paymentId,
      })
      // Don't throw - email failures shouldn't break payment processing
    }
  }

  /**
   * Send admin notification for new enrollment
   */
  async sendAdminNewEnrollmentNotification(enrollmentId: string): Promise<void> {
    try {
      logInfo("Sending admin enrollment notification", {
        component: "email-notification-service",
        action: "sendAdminNewEnrollmentNotification",
        enrollmentId,
      })

      const supabase = createServiceRoleClient()

      // Fetch enrollment with related data
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select(
          `
          id,
          enrolled_at,
          user_id,
          course_id,
          profiles:user_id (
            id,
            name,
            email
          ),
          courses:course_id (
            id,
            title
          )
        `
        )
        .eq("id", enrollmentId)
        .single()

      if (enrollmentError || !enrollment) {
        logError("Failed to fetch enrollment data for admin notification", enrollmentError, {
          component: "email-notification-service",
          action: "sendAdminNewEnrollmentNotification",
          enrollmentId,
        })
        return
      }

      const profile = enrollment.profiles as any
      const course = enrollment.courses as any

      if (!profile || !course) {
        logError("Missing profile or course data for admin enrollment notification", null, {
          component: "email-notification-service",
          action: "sendAdminNewEnrollmentNotification",
          enrollmentId,
        })
        return
      }

      // Fetch admin emails
      const { data: admins } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_type", "admin")

      if (!admins || admins.length === 0) {
        logWarning("No admin users found for enrollment notification", {
          component: "email-notification-service",
          action: "sendAdminNewEnrollmentNotification",
          enrollmentId,
        })
        return
      }

      // Send notification to all admins
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"
      const adminDashboardUrl = new URL("/admin", appUrl).toString()

      for (const admin of admins) {
        await emailService.sendAdminNotificationEmail({
          adminEmail: admin.email,
          type: "enrollment",
          userName: profile.name || profile.email,
          userEmail: profile.email,
          courseName: course.title,
          courseId: course.id,
          enrollmentDate: enrollment.enrolled_at || new Date().toISOString(),
        })
      }

      logInfo("Admin enrollment notification sent successfully", {
        component: "email-notification-service",
        action: "sendAdminNewEnrollmentNotification",
        enrollmentId,
        adminCount: admins.length,
      })
    } catch (error) {
      logError("Error sending admin enrollment notification", error, {
        component: "email-notification-service",
        action: "sendAdminNewEnrollmentNotification",
        enrollmentId,
      })
      // Don't throw - email failures shouldn't break enrollment
    }
  }

  /**
   * Send admin notification for new payment
   */
  async sendAdminNewPaymentNotification(paymentId: string): Promise<void> {
    try {
      logInfo("Sending admin payment notification", {
        component: "email-notification-service",
        action: "sendAdminNewPaymentNotification",
        paymentId,
      })

      const supabase = createServiceRoleClient()

      // Fetch payment with related data
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select(
          `
          id,
          transaction_id,
          amount,
          currency,
          completed_at,
          user_id,
          course_id,
          profiles:user_id (
            id,
            name,
            email
          ),
          courses:course_id (
            id,
            title
          )
        `
        )
        .eq("id", paymentId)
        .single()

      if (paymentError || !payment) {
        logError("Failed to fetch payment data for admin notification", paymentError, {
          component: "email-notification-service",
          action: "sendAdminNewPaymentNotification",
          paymentId,
        })
        return
      }

      const profile = payment.profiles as any
      const course = payment.courses as any

      if (!profile || !course) {
        logError("Missing profile or course data for admin payment notification", null, {
          component: "email-notification-service",
          action: "sendAdminNewPaymentNotification",
          paymentId,
        })
        return
      }

      // Fetch admin emails
      const { data: admins } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_type", "admin")

      if (!admins || admins.length === 0) {
        logWarning("No admin users found for payment notification", {
          component: "email-notification-service",
          action: "sendAdminNewPaymentNotification",
          paymentId,
        })
        return
      }

      // Send notification to all admins
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"
      const adminDashboardUrl = new URL("/admin", appUrl).toString()

      for (const admin of admins) {
        await emailService.sendAdminNotificationEmail({
          adminEmail: admin.email,
          type: "payment",
          userName: profile.name || profile.email,
          userEmail: profile.email,
          courseName: course.title,
          courseId: course.id,
          transactionId: payment.transaction_id || payment.id,
          amount: parseFloat(payment.payment_amount?.toString() || payment.amount?.toString() || "0"),
          currency: payment.payment_currency || payment.currency || "USD",
          paymentDate: payment.completed_at || new Date().toISOString(),
        })
      }

      logInfo("Admin payment notification sent successfully", {
        component: "email-notification-service",
        action: "sendAdminNewPaymentNotification",
        paymentId,
        adminCount: admins.length,
      })
    } catch (error) {
      logError("Error sending admin payment notification", error, {
        component: "email-notification-service",
        action: "sendAdminNewPaymentNotification",
        paymentId,
      })
      // Don't throw - email failures shouldn't break payment processing
    }
  }
}

// Export singleton instance
export const emailNotificationService = new EmailNotificationService()
