/**
 * Email Templates
 * All email templates for the LMS
 */

import {
  generateBaseEmailTemplate,
  generateCourseDetails,
  generateEnrollmentDetails,
  generateCertificateDetails,
  generatePaymentDetails,
  generateOtpCodeSection,
  generateAuthNoticeBox,
  generateAuthFeatureList,
  generateConfirmationUrlFallback,
  generateEmailCtaButton,
} from "./email-generator"
import type {
  EnrollmentEmailData,
  CompletionEmailData,
  CertificateEmailData,
  PaymentEmailData,
  WelcomeEmailData,
  PasswordResetEmailData,
  EmailConfirmationEmailData,
  AdminNotificationEmailData,
  EmailTemplate,
  EmailBrandSettings,
} from "./email-types"

// Helper to get brand settings for templates
async function getBrandSettingsForEmail(): Promise<EmailBrandSettings> {
  try {
    const { getBrandSettings } = await import("../supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"

    return {
      platformName: brandSettings.platformName,
      logoUrl: brandSettings.logoBlack,
      logoWhite: brandSettings.logoWhite,
      supportEmail: brandSettings.contactEmail || "support@easelms.org",
      appUrl: brandSettings.appUrl || appUrl,
    }
  } catch (error) {
    console.error("Error fetching brand settings for email:", error)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.easelms.org"
    return {
      platformName: "EaseLMS",
      logoUrl: "https://cldup.com/VQGhFU5kd6.svg",
      logoWhite: "https://cldup.com/bwlFqC4f8I.svg",
      supportEmail: "support@easelms.org",
      appUrl,
    }
  }
}

// Welcome email template
export const welcomeTemplate: EmailTemplate = {
  subject: (data: WelcomeEmailData) => `Welcome to ${data.dashboardUrl.includes("easelms") ? "EaseLMS" : "our platform"}!`,
  html: async (data: WelcomeEmailData) => {
    const brandSettings = await getBrandSettingsForEmail()
    const content = `
      <p>Hi ${data.firstName},</p>
      <p>Welcome to ${brandSettings.platformName}! We're excited to have you join our learning community.</p>
      <p>You can now explore our courses, track your progress, and earn certificates as you complete courses.</p>
      <p>Get started by browsing our course catalog and enrolling in courses that interest you.</p>
    `
    return generateBaseEmailTemplate(
      `Welcome to ${brandSettings.platformName}!`,
      "Your learning journey starts here",
      content,
      {
        text: "Go to Dashboard",
        url: data.dashboardUrl,
      },
      brandSettings
    )
  },
  text: (data: WelcomeEmailData) => `
Welcome to our platform!

Hi ${data.firstName},

Welcome! We're excited to have you join our learning community.

You can now explore our courses, track your progress, and earn certificates as you complete courses.

Get started by browsing our course catalog and enrolling in courses that interest you.

Visit your dashboard: ${data.dashboardUrl}

Need help? Contact us at support@easelms.org
  `.trim(),
}

// Course enrollment email template
export const courseEnrollmentTemplate: EmailTemplate = {
  subject: (data: EnrollmentEmailData) => `You've been enrolled in ${data.courseName}`,
  html: async (data: EnrollmentEmailData) => {
    const brandSettings = await getBrandSettingsForEmail()
    const courseDetails = generateCourseDetails({
      courseName: data.courseName,
      courseDescription: data.courseDescription,
      courseImage: data.courseImage,
      courseId: data.courseId,
    })
    const enrollmentDetails = generateEnrollmentDetails({
      enrolledAt: data.enrolledAt,
      courseName: data.courseName,
    })
    const content = `
      <p>Hi ${data.firstName},</p>
      <p>Great news! You've been successfully enrolled in <strong>${data.courseName}</strong>.</p>
      ${courseDetails}
      ${enrollmentDetails}
      <p>You can now start learning at your own pace. Access the course anytime from your dashboard.</p>
    `
    return generateBaseEmailTemplate(
      "Course Enrollment Confirmed",
      "You're all set to start learning",
      content,
      {
        text: "Start Learning",
        url: data.courseUrl,
      },
      brandSettings
    )
  },
  text: (data: EnrollmentEmailData) => `
Course Enrollment Confirmed

Hi ${data.firstName},

Great news! You've been successfully enrolled in ${data.courseName}.

Enrolled: ${new Date(data.enrolledAt).toLocaleDateString()}
Course: ${data.courseName}

You can now start learning at your own pace. Access the course anytime from your dashboard.

Start learning: ${data.courseUrl}

Visit dashboard: ${data.dashboardUrl}
  `.trim(),
}

// Course completion email template
export const courseCompletionTemplate: EmailTemplate = {
  subject: (data: CompletionEmailData) => `Congratulations! You've completed ${data.courseName}`,
  html: async (data: CompletionEmailData) => {
    const brandSettings = await getBrandSettingsForEmail()
    const completionDate = new Date(data.completedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const certificateSection = data.certificateEnabled && data.certificateUrl
      ? `
      <div class="info-box" style="background-color: #f0f7ff; border-left: 4px solid hsl(240, 5.9%, 10%); padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p class="info-box-text" style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1a1a1a;">🎓 Certificate Available!</p>
        <p class="info-box-text" style="margin: 0 0 16px; font-size: 14px; color: #333333;">Your certificate is ready for download. This certificate verifies your successful completion of the course.</p>
        <a href="${data.certificateUrl}" style="display: inline-block; padding: 12px 24px; background-color: hsl(240, 5.9%, 10%); color: hsl(0, 0%, 98%); text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Download Certificate</a>
      </div>
    `
      : ""
    const content = `
      <p>Hi ${data.firstName},</p>
      <p><strong>Congratulations!</strong> You've successfully completed <strong>${data.courseName}</strong>.</p>
      <p>You completed this course on ${completionDate}. Well done on your dedication and commitment to learning!</p>
      ${certificateSection}
      <p>Continue your learning journey by exploring more courses in our catalog.</p>
    `
    return generateBaseEmailTemplate(
      "Course Completed! 🎉",
      "You've achieved a great milestone",
      content,
      {
        text: data.certificateEnabled && data.certificateUrl ? "Download Certificate" : "Browse More Courses",
        url: data.certificateEnabled && data.certificateUrl ? data.certificateUrl : data.dashboardUrl,
      },
      brandSettings
    )
  },
  text: (data: CompletionEmailData) => {
    const completionDate = new Date(data.completedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    return `
Course Completed! 🎉

Hi ${data.firstName},

Congratulations! You've successfully completed ${data.courseName}.

You completed this course on ${completionDate}. Well done on your dedication and commitment to learning!

${data.certificateEnabled && data.certificateUrl ? `Your certificate is ready for download: ${data.certificateUrl}` : ""}

Continue your learning journey by exploring more courses in our catalog.

Visit dashboard: ${data.dashboardUrl}
  `.trim()
  },
}

// Certificate ready email template
export const certificateReadyTemplate: EmailTemplate = {
  subject: (data: CertificateEmailData) => `Your certificate for ${data.courseName} is ready`,
  html: async (data: CertificateEmailData) => {
    const brandSettings = await getBrandSettingsForEmail()
    const certificateDetails = generateCertificateDetails({
      certificateNumber: data.certificateNumber,
      courseName: data.courseName,
      issuedAt: data.issuedAt,
    })
    const content = `
      <p>Hi ${data.firstName},</p>
      <p>Your certificate for <strong>${data.courseName}</strong> is ready for download!</p>
      ${certificateDetails}
      <p>This certificate verifies your successful completion of the course. You can download it anytime from your dashboard.</p>
    `
    return generateBaseEmailTemplate(
      "Certificate Ready",
      "Your achievement certificate is available",
      content,
      {
        text: "Download Certificate",
        url: data.certificateUrl,
      },
      brandSettings
    )
  },
  text: (data: CertificateEmailData) => {
    const date = new Date(data.issuedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    return `
Certificate Ready

Hi ${data.firstName},

Your certificate for ${data.courseName} is ready for download!

Certificate Number: ${data.certificateNumber}
Course: ${data.courseName}
Issued: ${date}

This certificate verifies your successful completion of the course. You can download it anytime from your dashboard.

Download certificate: ${data.certificateUrl}

Visit dashboard: ${data.dashboardUrl}
  `.trim()
  },
}

// Payment confirmation email template
export const paymentConfirmationTemplate: EmailTemplate = {
  subject: (data: PaymentEmailData) => `Payment Confirmed - ${data.courseName}`,
  html: async (data: PaymentEmailData) => {
    const brandSettings = await getBrandSettingsForEmail()
    const paymentDetails = generatePaymentDetails({
      transactionId: data.transactionId,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      completedAt: data.completedAt,
      courseName: data.courseName,
    })
    const content = `
      <p>Hi ${data.firstName},</p>
      <p>Your payment has been successfully processed. You now have access to <strong>${data.courseName}</strong>.</p>
      ${paymentDetails}
      <p>You can start learning immediately. Access the course from your dashboard.</p>
    `
    return generateBaseEmailTemplate(
      "Payment Confirmed",
      "You now have access to your course",
      content,
      {
        text: "Start Learning",
        url: data.courseUrl,
      },
      brandSettings
    )
  },
  text: (data: PaymentEmailData) => {
    const date = new Date(data.completedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    return `
Payment Confirmed

Hi ${data.firstName},

Your payment has been successfully processed.

Amount: ${data.amount.toFixed(2)} ${data.currency}
Date: ${date}

You can start learning immediately. Access the course from your dashboard.

Start learning: ${data.courseUrl}

Visit dashboard: ${data.dashboardUrl}
  `.trim()
  },
}

// Payment failed email template
export const paymentFailedTemplate: EmailTemplate = {
  subject: (data: PaymentEmailData) => `Payment Failed - ${data.courseName}`,
  html: async (data: PaymentEmailData) => {
    const brandSettings = await getBrandSettingsForEmail()
    const paymentDetails = generatePaymentDetails({
      transactionId: data.transactionId,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      completedAt: data.completedAt,
      courseName: data.courseName,
      failureReason: data.failureReason,
    })
    const content = `
      <p>Hi ${data.firstName},</p>
      <p>Unfortunately, your payment for <strong>${data.courseName}</strong> could not be processed.</p>
      ${paymentDetails}
      <p>Please try again or contact our support team if you continue to experience issues.</p>
    `
    return generateBaseEmailTemplate(
      "Payment Failed",
      "We couldn't process your payment",
      content,
      {
        text: "Try Again",
        url: data.courseUrl,
      },
      brandSettings
    )
  },
  text: (data: PaymentEmailData) => {
    const date = new Date(data.completedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    return `
Payment Failed

Hi ${data.firstName},

Unfortunately, your payment could not be processed.

Amount: ${data.amount.toFixed(2)} ${data.currency}
Date: ${date}
${data.failureReason ? `Reason: ${data.failureReason}` : ""}

Please try again or contact our support team if you continue to experience issues.

Try again: ${data.courseUrl}

Contact support: support@easelms.org
  `.trim()
  },
}

// Admin new enrollment notification template
export const adminNewEnrollmentTemplate: EmailTemplate = {
  subject: (data: AdminNotificationEmailData) => `New Enrollment: ${data.userName} enrolled in ${data.courseName}`,
  html: async (data: AdminNotificationEmailData) => {
    const brandSettings = await getBrandSettingsForEmail()
    const enrollmentDate = data.enrollmentDate
      ? new Date(data.enrollmentDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Just now"
    const content = `
      <p>A new student has enrolled in a course.</p>
      <div class="info-box" style="background-color: #f0f7ff; border-left: 4px solid hsl(240, 5.9%, 10%); padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p class="info-box-text" style="margin: 0 0 8px; font-size: 14px; color: #333333;"><strong>Student:</strong> ${data.userName} (${data.userEmail})</p>
        <p class="info-box-text" style="margin: 0 0 8px; font-size: 14px; color: #333333;"><strong>Course:</strong> ${data.courseName}</p>
        <p class="info-box-text" style="margin: 0; font-size: 14px; color: #333333;"><strong>Enrolled:</strong> ${enrollmentDate}</p>
      </div>
    `
    return generateBaseEmailTemplate(
      "New Course Enrollment",
      "A new student has enrolled",
      content,
      {
        text: "View in Dashboard",
        url: data.adminDashboardUrl,
      },
      brandSettings
    )
  },
  text: (data: AdminNotificationEmailData) => {
    const enrollmentDate = data.enrollmentDate
      ? new Date(data.enrollmentDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Just now"
    return `
New Course Enrollment

A new student has enrolled in a course.

Student: ${data.userName} (${data.userEmail})
Course: ${data.courseName}
Enrolled: ${enrollmentDate}

View in dashboard: ${data.adminDashboardUrl}
  `.trim()
  },
}

// Admin new payment notification template
export const adminNewPaymentTemplate: EmailTemplate = {
  subject: (data: AdminNotificationEmailData) => `New Payment: ${data.amount} ${data.currency} for ${data.courseName}`,
  html: async (data: AdminNotificationEmailData) => {
    const brandSettings = await getBrandSettingsForEmail()
    const paymentDate = data.paymentDate
      ? new Date(data.paymentDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Just now"
    const content = `
      <p>A new payment has been received.</p>
      <div class="info-box" style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p class="info-box-text" style="margin: 0 0 8px; font-size: 14px; color: #333333;"><strong>Student:</strong> ${data.userName} (${data.userEmail})</p>
        <p class="info-box-text" style="margin: 0 0 8px; font-size: 14px; color: #333333;"><strong>Course:</strong> ${data.courseName}</p>
        <p class="info-box-text" style="margin: 0 0 8px; font-size: 14px; color: #333333;"><strong>Amount:</strong> ${data.amount?.toFixed(2)} ${data.currency}</p>
        <p class="info-box-text" style="margin: 0; font-size: 14px; color: #333333;"><strong>Date:</strong> ${paymentDate}</p>
      </div>
    `
    return generateBaseEmailTemplate(
      "New Payment Received",
      "A new payment has been processed",
      content,
      {
        text: "View in Dashboard",
        url: data.adminDashboardUrl,
      },
      brandSettings
    )
  },
  text: (data: AdminNotificationEmailData) => {
    const paymentDate = data.paymentDate
      ? new Date(data.paymentDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Just now"
    return `
New Payment Received

A new payment has been received.

Student: ${data.userName} (${data.userEmail})
Course: ${data.courseName}
Amount: ${data.amount?.toFixed(2)} ${data.currency}
Date: ${paymentDate}

View in dashboard: ${data.adminDashboardUrl}
  `.trim()
  },
}

// Admin course completion notification template
export const adminCourseCompletionTemplate: EmailTemplate = {
  subject: (data: AdminNotificationEmailData) => `Course Completed: ${data.userName} completed ${data.courseName}`,
  html: async (data: AdminNotificationEmailData) => {
    const brandSettings = await getBrandSettingsForEmail()
    const completionDate = data.enrollmentDate
      ? new Date(data.enrollmentDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Just now"
    const content = `
      <p>A student has completed a course.</p>
      <div class="info-box" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p class="info-box-text" style="margin: 0 0 8px; font-size: 14px; color: #333333;"><strong>Student:</strong> ${data.userName} (${data.userEmail})</p>
        <p class="info-box-text" style="margin: 0 0 8px; font-size: 14px; color: #333333;"><strong>Course:</strong> ${data.courseName}</p>
        <p class="info-box-text" style="margin: 0; font-size: 14px; color: #333333;"><strong>Completed:</strong> ${completionDate}</p>
      </div>
    `
    return generateBaseEmailTemplate(
      "Course Completion",
      "A student has completed a course",
      content,
      {
        text: "View in Dashboard",
        url: data.adminDashboardUrl,
      },
      brandSettings
    )
  },
  text: (data: AdminNotificationEmailData) => {
    const completionDate = data.enrollmentDate
      ? new Date(data.enrollmentDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Just now"
    return `
Course Completion

A student has completed a course.

Student: ${data.userName} (${data.userEmail})
Course: ${data.courseName}
Completed: ${completionDate}

View in dashboard: ${data.adminDashboardUrl}
  `.trim()
  },
}

// Password reset email template
export const passwordResetTemplate: EmailTemplate = {
  subject: (data: PasswordResetEmailData) =>
    `Your ${data.platformName || "EaseLMS"} Password Reset Code`,
  html: async (data: PasswordResetEmailData) => {
    const brandSettings = await getBrandSettingsForEmail()
    const greeting = data.firstName ? `Hi ${data.firstName},` : "Hi,"
    const otpSection = generateOtpCodeSection(data.resetCode)
    const expiryNotice = generateAuthNoticeBox(
      "This verification code will expire in 10 minutes. If you didn't request a password reset, please ignore this email."
    )
    const featureList = generateAuthFeatureList([
      "Create a new secure password",
      "Regain access to your account",
      "Continue your courses and learning progress",
      "Manage your account settings",
    ])
    const content = `
      <p>${greeting}</p>
      <p>We received a request to reset your password for your ${brandSettings.platformName} account. Use the verification code below to proceed with creating a new password:</p>
      ${otpSection}
      ${expiryNotice}
      <p>Once you've entered the verification code, you'll be able to:</p>
      ${featureList}
      <p>If you're having trouble with the verification code, you can request a new one from the password reset page.</p>
    `
    return generateBaseEmailTemplate(
      "Password Reset",
      "Secure your account with a new password",
      content,
      undefined,
      brandSettings,
      `You received this email because a password reset was requested for your ${brandSettings.platformName} account.`
    )
  },
  text: (data: PasswordResetEmailData) => {
    const greeting = data.firstName ? `Hi ${data.firstName},` : "Hi,"
    return `
Password Reset

${greeting}

We received a request to reset your password. Use the verification code below to proceed:

${data.resetCode}

This verification code will expire in 10 minutes. If you didn't request a password reset, please ignore this email.

Enter this code in the password reset form to continue.

Need help? Contact us at support@easelms.org
  `.trim()
  },
}

// Email confirmation template
export const emailConfirmationTemplate: EmailTemplate = {
  subject: (data: EmailConfirmationEmailData) =>
    `Confirm your email to get started on ${data.platformName || "EaseLMS"}!`,
  html: async (data: EmailConfirmationEmailData) => {
    const brandSettings = await getBrandSettingsForEmail()
    const greeting = data.firstName ? `Hi ${data.firstName},` : "Hi,"
    const securityNotice = generateAuthNoticeBox(
      `This confirmation link will expire in 30 minutes. If you didn't create an account with ${brandSettings.platformName}, please ignore this email.`
    )
    const featureList = generateAuthFeatureList([
      "Browse and enroll in courses",
      "Track your learning progress",
      "Earn certificates as you complete courses",
      "Access your dashboard anytime",
    ])
    const urlFallback = generateConfirmationUrlFallback(data.confirmationUrl)
    const ctaButton = generateEmailCtaButton("Confirm My Email Address", data.confirmationUrl)
    const content = `
      <p>${greeting}</p>
      <p>To complete your registration and start learning, please confirm your email address by clicking the button below:</p>
      ${ctaButton}
      ${securityNotice}
      <p>Once confirmed, you'll be able to:</p>
      ${featureList}
      ${urlFallback}
    `
    return generateBaseEmailTemplate(
      `Welcome to ${brandSettings.platformName}!`,
      "Your learning journey starts here",
      content,
      undefined,
      brandSettings,
      `You received this email because you signed up for a ${brandSettings.platformName} account.`
    )
  },
  text: (data: EmailConfirmationEmailData) => {
    const greeting = data.firstName ? `Hi ${data.firstName},` : "Hi,"
    return `
Confirm Your Email

${greeting}

To complete your registration and start learning, please confirm your email address by visiting the link below:

${data.confirmationUrl}

This confirmation link will expire in 30 minutes. If you didn't create an account, please ignore this email.

Need help? Contact us at support@easelms.org
  `.trim()
  },
}

// Export all templates
export const emailTemplates: Record<string, EmailTemplate> = {
  welcome: welcomeTemplate,
  passwordReset: passwordResetTemplate,
  emailConfirmation: emailConfirmationTemplate,
  courseEnrollment: courseEnrollmentTemplate,
  courseCompletion: courseCompletionTemplate,
  certificateReady: certificateReadyTemplate,
  paymentConfirmation: paymentConfirmationTemplate,
  paymentFailed: paymentFailedTemplate,
  adminNewEnrollment: adminNewEnrollmentTemplate,
  adminNewPayment: adminNewPaymentTemplate,
  adminCourseCompletion: adminCourseCompletionTemplate,
}
