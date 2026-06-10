/**
 * Email Generator
 * Reusable functions for generating email HTML structure and components
 */

import type { EmailBrandSettings } from "./email-types"

/**
 * Generate base email template with consistent styling
 */
export function generateBaseEmailTemplate(
  title: string,
  subtitle: string,
  content: string,
  ctaButton?: { text: string; url: string },
  brandSettings?: EmailBrandSettings,
  footerNotice?: string
): string {
  const platformName = brandSettings?.platformName || "EaseLMS"
  const logoBlack = brandSettings?.logoUrl || "https://cldup.com/VQGhFU5kd6.svg"
  const logoWhite = brandSettings?.logoWhite || "https://cldup.com/bwlFqC4f8I.svg"
  const supportEmail = brandSettings?.supportEmail || "support@easelms.org"
  const appUrl = brandSettings?.appUrl || "https://www.easelms.org"

  const receivingNotice =
    footerNotice ||
    `You're receiving this email because you have an account with ${platformName}.`

  const ctaButtonHtml = ctaButton
    ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px auto;">
      <tr>
        <td class="email-cta-button" style="border-radius: 6px; background-color: hsl(240, 5.9%, 10%);">
          <a href="${ctaButton.url}" style="display: inline-block; padding: 14px 28px; color: hsl(0, 0%, 98%); text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">${ctaButton.text}</a>
        </td>
      </tr>
    </table>
  `
    : ""
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    @media (max-width: 600px) {
      .email-wrapper {
        padding: 20px 10px !important;
      }
      .email-container {
        max-width: 100% !important;
        width: 100% !important;
      }
      .email-header {
        padding: 30px 20px 20px !important;
      }
      .email-content {
        padding: 0 20px 30px !important;
      }
      .email-title {
        font-size: 24px !important;
      }
      .email-footer {
        padding: 24px 20px !important;
      }
      .footer-contact-mobile::before {
        content: "Need help? Contact us at\\A";
        white-space: pre;
      }
      .footer-contact-mobile .email-footer-link {
        display: block !important;
        margin-top: 4px !important;
      }
    }

    @media (prefers-color-scheme: dark) {
      .email-wrapper {
        background-color: #0a0a0a !important;
      }
      .email-container {
        background-color: #1a1a1a !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
      }
      .email-header {
        background-color: #1a1a1a !important;
      }
      .email-content {
        background-color: #1a1a1a !important;
        color: #e5e5e5 !important;
      }
      .email-title {
        color: #ffffff !important;
      }
      .email-subtitle {
        color: #b0b0b0 !important;
      }
      .email-text {
        color: #d1d1d1 !important;
      }
      .email-footer {
        background-color: #1f1f1f !important;
        border-top-color: #333333 !important;
      }
      .email-footer-text {
        color: #b0b0b0 !important;
      }
      .email-footer-link {
        color: hsl(0, 0%, 98%) !important;
      }
      .email-cta-button {
        background-color: hsl(0, 0%, 98%) !important;
      }
      .email-cta-button a {
        color: hsl(240, 5.9%, 10%) !important;
      }
      .brand-logo-light {
        display: none !important;
      }
      .brand-logo-dark {
        display: block !important;
      }
      .powered-by-logo-light {
        display: none !important;
      }
      .powered-by-logo-dark {
        display: block !important;
      }
      .email-footer-small {
        color: #808080 !important;
      }
      .info-box {
        background-color: #252525 !important;
        border-left-color: hsl(0, 0%, 98%) !important;
      }
      .info-box-text {
        color: #d1d1d1 !important;
      }
      .otp-container {
        background-color: #252525 !important;
        border-color: hsl(0, 0%, 98%) !important;
      }
      .otp-label,
      .otp-instructions {
        color: #d1d1d1 !important;
      }
      .otp-code {
        color: hsl(0, 0%, 98%) !important;
        background-color: #1a1a1a !important;
        border-color: #333333 !important;
      }
      .confirmation-url {
        background-color: #252525 !important;
        color: hsl(0, 0%, 98%) !important;
      }
      .course-box {
        background-color: #252525 !important;
      }
      .course-title {
        color: #ffffff !important;
      }
      .course-description {
        color: #b0b0b0 !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-wrapper" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td class="email-header" style="padding: 40px 40px 30px; text-align: center; background-color: #ffffff;">
              <!-- Light mode logo (black) -->
              <img 
                src="${logoBlack}" 
                alt="${platformName}" 
                class="brand-logo-light"
                style="max-width: 200px; height: auto; display: block; margin: 0 auto;"
              />
              <!-- Dark mode logo (white) -->
              <img 
                src="${logoWhite}" 
                alt="${platformName}" 
                class="brand-logo-dark"
                style="max-width: 200px; height: auto; display: none; margin: 0 auto;"
              />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="email-content" style="padding: 0 40px 40px; background-color: #ffffff;">
              <h1 class="email-title" style="margin: 0 0 12px; font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">${title}</h1>
              ${subtitle ? `<p class="email-subtitle" style="margin: 0 0 32px; font-size: 16px; color: #666666; line-height: 1.6;">${subtitle}</p>` : ""}
              
              <div class="email-text" style="font-size: 16px; line-height: 1.6; color: #333333;">
                ${content}
              </div>
              
              ${ctaButtonHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          ${generateFooter(platformName, supportEmail, appUrl)}
          
          <!-- Notice -->
          <tr>
            <td class="email-footer" style="padding: 20px 40px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; text-align: center;">
              <p class="email-footer-small" style="margin: 0; font-size: 12px; color: #999999; line-height: 1.6;">
                ${receivingNotice}
              </p>
            </td>
          </tr>
          
          <!-- Powered by EaseLMS -->
          <tr>
            <td class="email-footer" style="padding: 20px 40px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; text-align: center;">
              <div class="powered-by-container">
                <a href="https://www.easelms.org" target="_blank" rel="noopener noreferrer" style="display: inline-block; text-decoration: none;">
                  <!-- Light mode logo (black) -->
                  <img 
                    src="https://cldup.com/DttVmSBdr9.png" 
                    alt="EaseLMS" 
                    class="powered-by-logo-light"
                    style="height: 12px; width: auto; display: block; margin: 0 auto;"
                  />
                  <!-- Dark mode logo (white) -->
                  <img 
                    src="https://cldup.com/gGEH37AYfE.png" 
                    alt="EaseLMS" 
                    class="powered-by-logo-dark"
                    style="height: 12px; width: auto; display: none; margin: 0 auto;"
                  />
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generate course details section
 */
export function generateCourseDetails(data: {
  courseName: string
  courseDescription?: string
  courseImage?: string
  courseId: number
}): string {
  const imageHtml = data.courseImage
    ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
      <tr>
        <td>
          <img src="${data.courseImage}" alt="${data.courseName}" style="max-width: 100%; height: auto; border-radius: 8px;" />
        </td>
      </tr>
    </table>
  `
    : ""

  return `
    <div class="course-box" style="background-color: #f9f9f9; border-radius: 8px; padding: 24px; margin: 24px 0;">
      ${imageHtml}
      <h2 class="course-title" style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #1a1a1a;">${data.courseName}</h2>
      ${data.courseDescription ? `<p class="course-description" style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">${data.courseDescription}</p>` : ""}
    </div>
  `
}

/**
 * Generate enrollment details section
 */
export function generateEnrollmentDetails(data: {
  enrolledAt: string
  courseName: string
}): string {
  const date = new Date(data.enrolledAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return `
    <div class="info-box" style="background-color: #f0f7ff; border-left: 4px solid hsl(240, 5.9%, 10%); padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p class="info-box-text" style="margin: 0; font-size: 14px; color: #333333;">
        <strong>Enrolled:</strong> ${date}<br />
        <strong>Course:</strong> ${data.courseName}
      </p>
    </div>
  `
}

/**
 * Generate certificate details section
 */
export function generateCertificateDetails(data: {
  certificateNumber: string
  courseName: string
  issuedAt: string
}): string {
  const date = new Date(data.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return `
    <div class="info-box" style="background-color: #f0f7ff; border-left: 4px solid hsl(240, 5.9%, 10%); padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p class="info-box-text" style="margin: 0 0 8px; font-size: 14px; color: #333333;">
        <strong>Certificate Number:</strong> ${data.certificateNumber}
      </p>
      <p class="info-box-text" style="margin: 0 0 8px; font-size: 14px; color: #333333;">
        <strong>Course:</strong> ${data.courseName}
      </p>
      <p class="info-box-text" style="margin: 0; font-size: 14px; color: #333333;">
        <strong>Issued:</strong> ${date}
      </p>
    </div>
  `
}

/**
 * Generate payment/transaction details section
 */
export function generatePaymentDetails(data: {
  transactionId: string
  amount: number
  currency: string
  paymentMethod: string
  completedAt: string
  courseName?: string
  failureReason?: string
}): string {
  const date = new Date(data.completedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const statusColor = data.failureReason ? "#dc2626" : "#16a34a"
  const statusText = data.failureReason ? "Failed" : "Completed"

  return `
    <div class="info-box" style="background-color: ${data.failureReason ? "#fef2f2" : "#f0fdf4"}; border-left: 4px solid ${statusColor}; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p class="info-box-text" style="margin: 0 0 8px; font-size: 14px; color: #333333;">
        <strong>Amount:</strong> ${data.amount.toFixed(2)} ${data.currency}
      </p>
      <p class="info-box-text" style="margin: 0 0 8px; font-size: 14px; color: #333333;">
        <strong>Status:</strong> <span style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
      </p>
      <p class="info-box-text" style="margin: 0; font-size: 14px; color: #333333;">
        <strong>Date:</strong> ${date}
      </p>
      ${data.failureReason ? `<p class="info-box-text" style="margin: 16px 0 0; font-size: 14px; color: #dc2626;"><strong>Reason:</strong> ${data.failureReason}</p>` : ""}
    </div>
  `
}

/**
 * Generate inline CTA button for auth emails (used inside content body)
 */
export function generateEmailCtaButton(text: string, url: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
      <tr>
        <td class="email-cta-button" style="border-radius: 6px; background-color: hsl(240, 5.9%, 10%);">
          <a href="${url}" style="display: inline-block; padding: 14px 28px; color: hsl(0, 0%, 98%); text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">${text}</a>
        </td>
      </tr>
    </table>
  `
}

/**
 * Generate OTP verification code section for auth emails
 */
export function generateOtpCodeSection(code: string): string {
  return `
    <div class="otp-container" style="background-color: #f9f9f9; border: 2px solid hsl(240, 5.9%, 10%); border-radius: 12px; padding: 30px; text-align: center; margin: 24px 0;">
      <p class="otp-label" style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1a1a1a;">Your verification code is:</p>
      <div class="otp-code" style="font-size: 36px; font-weight: 700; color: hsl(240, 5.9%, 10%); letter-spacing: 8px; font-family: 'Courier New', monospace; background: #ffffff; padding: 20px 30px; border-radius: 8px; border: 1px solid #e5e5e5; display: inline-block; margin: 10px 0;">${code}</div>
      <p class="otp-instructions" style="margin: 15px 0 0; font-size: 14px; color: #666666;">Enter this code in the password reset form to continue</p>
    </div>
  `
}

/**
 * Generate auth notice box (expiry, security, etc.)
 */
export function generateAuthNoticeBox(message: string): string {
  return `
    <div class="info-box" style="background-color: #f0f7ff; border-left: 4px solid hsl(240, 5.9%, 10%); padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p class="info-box-text" style="margin: 0; font-size: 14px; color: #333333; line-height: 1.6;">${message}</p>
    </div>
  `
}

/**
 * Generate feature list for auth onboarding emails
 */
export function generateAuthFeatureList(items: string[]): string {
  const listItems = items.map((item) => `<li style="margin-bottom: 8px;">${item}</li>`).join("")
  return `
    <ul style="color: #333333; font-size: 16px; line-height: 1.7; margin: 20px 0; padding-left: 20px;">
      ${listItems}
    </ul>
  `
}

/**
 * Generate confirmation URL fallback for email clients without button support
 */
export function generateConfirmationUrlFallback(url: string): string {
  return `
    <p style="margin: 0 0 12px; font-size: 16px; color: #333333;">If the button doesn't work, you can also copy and paste this link into your browser:</p>
    <p class="confirmation-url" style="word-break: break-all; color: hsl(240, 5.9%, 10%); font-size: 14px; background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 0 0 24px;">${url}</p>
  `
}

/**
 * Generate footer with support contact and company information
 */
export function generateFooter(
  platformName: string = "EaseLMS",
  supportEmail: string = "support@easelms.org",
  appUrl: string = "https://www.easelms.org"
): string {
  return `
          <tr>
            <td class="email-footer" style="padding: 32px 40px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; text-align: center;">
              <p class="email-footer-text footer-contact-mobile" style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
                Need help? Contact us at <a href="mailto:${supportEmail}" class="email-footer-link" style="color: hsl(240, 5.9%, 10%); text-decoration: none;">${supportEmail}</a>
              </p>
            </td>
          </tr>
  `
}
