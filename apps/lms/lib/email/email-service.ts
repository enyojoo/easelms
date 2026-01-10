/**
 * Email Service
 * Core email sending functionality using SendGrid
 */

import sgMail from "@sendgrid/mail"
import { emailTemplates } from "./email-templates"
import type { EmailData, EmailServiceConfig, SendGridResponse } from "./email-types"
import { logError, logInfo, logWarning } from "../utils/errorHandler"

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
} else {
  logWarning("SENDGRID_API_KEY not found in environment variables", {
    component: "email-service",
    action: "initialization",
  })
}

// Email service configuration
const emailConfig: EmailServiceConfig = {
  fromEmail: process.env.SENDGRID_FROM_EMAIL || "noreply@easelms.org",
  fromName: process.env.SENDGRID_FROM_NAME || "EaseLMS",
  replyTo: process.env.SENDGRID_REPLY_TO || "support@easelms.org",
}

class EmailService {
  /**
   * Generic email sending method
   */
  async sendEmail(emailData: EmailData): Promise<SendGridResponse> {
    if (!SENDGRID_API_KEY) {
      const error = "SendGrid API key not configured"
      logError("Email sending failed", new Error(error), {
        component: "email-service",
        action: "sendEmail",
        to: emailData.to,
        template: emailData.template,
      })
      return {
        success: false,
        error,
      }
    }

    try {
      const template = emailTemplates[emailData.template]
      if (!template) {
        const error = `Email template "${emailData.template}" not found`
        logError("Email template not found", new Error(error), {
          component: "email-service",
          action: "sendEmail",
          template: emailData.template,
        })
        return {
          success: false,
          error,
        }
      }

      // Get subject (can be string or function)
      const subject =
        typeof template.subject === "function"
          ? template.subject(emailData.data)
          : template.subject

      // Generate HTML and text content
      const htmlResult = template.html(emailData.data)
      const htmlContent = htmlResult instanceof Promise ? await htmlResult : htmlResult
      const textContent = template.text(emailData.data)

      const msg = {
        to: emailData.to,
        from: {
          email: emailConfig.fromEmail,
          name: emailConfig.fromName,
        },
        replyTo: emailConfig.replyTo,
        subject,
        html: htmlContent,
        text: textContent,
      }

      logInfo("Sending email", {
        component: "email-service",
        action: "sendEmail",
        to: emailData.to,
        template: emailData.template,
        subject,
      })

      const [response] = await sgMail.send(msg)

      logInfo("Email sent successfully", {
        component: "email-service",
        action: "sendEmail",
        to: emailData.to,
        template: emailData.template,
        messageId: response.headers["x-message-id"],
      })

      return {
        success: true,
        messageId: response.headers["x-message-id"] as string,
      }
    } catch (error: any) {
      logError("Failed to send email", error, {
        component: "email-service",
        action: "sendEmail",
        to: emailData.to,
        template: emailData.template,
        errorMessage: error?.message,
      })

      return {
        success: false,
        error: error?.message || "Unknown error occurred",
      }
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(data: {
    userEmail: string
    firstName: string
    lastName: string
  }): Promise<SendGridResponse> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"
    const dashboardUrl = `${appUrl}/learner/dashboard`

    return this.sendEmail({
      to: data.userEmail,
      template: "welcome",
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.userEmail,
        dashboardUrl,
      },
    })
  }

  /**
   * Send course enrollment confirmation email
   */
  async sendEnrollmentEmail(data: {
    userEmail: string
    firstName: string
    lastName: string
    courseName: string
    courseDescription?: string
    courseImage?: string
    courseId: number
    enrolledAt: string
  }): Promise<SendGridResponse> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"
    const courseUrl = `${appUrl}/learner/courses/${data.courseId}`
    const dashboardUrl = `${appUrl}/learner/dashboard`

    return this.sendEmail({
      to: data.userEmail,
      template: "courseEnrollment",
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.userEmail,
        courseName: data.courseName,
        courseDescription: data.courseDescription,
        courseImage: data.courseImage,
        courseId: data.courseId,
        enrolledAt: data.enrolledAt,
        dashboardUrl,
        courseUrl,
      },
    })
  }

  /**
   * Send course completion notification email
   */
  async sendCompletionEmail(data: {
    userEmail: string
    firstName: string
    lastName: string
    courseName: string
    courseId: number
    completedAt: string
    certificateEnabled: boolean
    certificateId?: string
    certificateUrl?: string
  }): Promise<SendGridResponse> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"
    const courseUrl = `${appUrl}/learner/courses/${data.courseId}`
    const dashboardUrl = `${appUrl}/learner/dashboard`

    return this.sendEmail({
      to: data.userEmail,
      template: "courseCompletion",
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.userEmail,
        courseName: data.courseName,
        courseId: data.courseId,
        completedAt: data.completedAt,
        certificateEnabled: data.certificateEnabled,
        certificateId: data.certificateId,
        dashboardUrl,
        courseUrl,
        certificateUrl: data.certificateUrl,
      },
    })
  }

  /**
   * Send certificate ready notification email
   */
  async sendCertificateEmail(data: {
    userEmail: string
    firstName: string
    lastName: string
    courseName: string
    certificateNumber: string
    issuedAt: string
    certificateUrl: string
  }): Promise<SendGridResponse> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"
    const dashboardUrl = `${appUrl}/learner/dashboard`

    return this.sendEmail({
      to: data.userEmail,
      template: "certificateReady",
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.userEmail,
        courseName: data.courseName,
        certificateNumber: data.certificateNumber,
        issuedAt: data.issuedAt,
        certificateUrl: data.certificateUrl,
        dashboardUrl,
      },
    })
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentEmail(data: {
    userEmail: string
    firstName: string
    lastName: string
    transactionId: string
    amount: number
    currency: string
    courseName: string
    courseId: number
    paymentMethod: string
    completedAt: string
    status: "completed" | "failed"
    failureReason?: string
  }): Promise<SendGridResponse> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"
    const courseUrl = `${appUrl}/learner/courses/${data.courseId}`
    const dashboardUrl = `${appUrl}/learner/dashboard`

    const template = data.status === "completed" ? "paymentConfirmation" : "paymentFailed"

    return this.sendEmail({
      to: data.userEmail,
      template,
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.userEmail,
        transactionId: data.transactionId,
        amount: data.amount,
        currency: data.currency,
        courseName: data.courseName,
        courseId: data.courseId,
        paymentMethod: data.paymentMethod,
        completedAt: data.completedAt,
        dashboardUrl,
        courseUrl,
        failureReason: data.failureReason,
      },
    })
  }

  /**
   * Send admin notification email
   */
  async sendAdminNotificationEmail(data: {
    adminEmail: string
    type: "enrollment" | "payment" | "completion"
    userName: string
    userEmail: string
    courseName?: string
    courseId?: number
    transactionId?: string
    amount?: number
    currency?: string
    enrollmentDate?: string
    paymentDate?: string
  }): Promise<SendGridResponse> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"
    const adminDashboardUrl = `${appUrl}/admin`

    let template: string
    if (data.type === "enrollment") {
      template = "adminNewEnrollment"
    } else if (data.type === "payment") {
      template = "adminNewPayment"
    } else {
      template = "adminCourseCompletion"
    }

    return this.sendEmail({
      to: data.adminEmail,
      template,
      data: {
        userName: data.userName,
        userEmail: data.userEmail,
        courseName: data.courseName,
        courseId: data.courseId,
        transactionId: data.transactionId,
        amount: data.amount,
        currency: data.currency,
        enrollmentDate: data.enrollmentDate,
        paymentDate: data.paymentDate,
        adminDashboardUrl,
      },
    })
  }

  /**
   * Send test email for development
   */
  async sendTestEmail(to: string): Promise<SendGridResponse> {
    return this.sendEmail({
      to,
      template: "welcome",
      data: {
        firstName: "Test",
        lastName: "User",
        email: to,
        dashboardUrl: process.env.NEXT_PUBLIC_APP_URL || "https://easelms.org",
      },
    })
  }
}

// Export singleton instance
export const emailService = new EmailService()
