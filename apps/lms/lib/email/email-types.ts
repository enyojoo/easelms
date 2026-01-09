/**
 * Email Type Definitions
 * TypeScript interfaces for email system
 */

// Email template structure
export interface EmailTemplate {
  subject: string | ((data: any) => string)
  html: (data: any) => string
  text: (data: any) => string
}

// Email data for sending
export interface EmailData {
  to: string
  template: string
  data: any
}

// Enrollment email data
export interface EnrollmentEmailData {
  firstName: string
  lastName: string
  email: string
  courseName: string
  courseDescription: string
  courseImage?: string
  courseId: number
  enrolledAt: string
  dashboardUrl: string
  courseUrl: string
}

// Course completion email data
export interface CompletionEmailData {
  firstName: string
  lastName: string
  email: string
  courseName: string
  courseId: number
  completedAt: string
  certificateEnabled: boolean
  certificateId?: string
  dashboardUrl: string
  courseUrl: string
  certificateUrl?: string
}

// Certificate email data
export interface CertificateEmailData {
  firstName: string
  lastName: string
  email: string
  courseName: string
  certificateNumber: string
  issuedAt: string
  certificateUrl: string
  dashboardUrl: string
}

// Payment email data
export interface PaymentEmailData {
  firstName: string
  lastName: string
  email: string
  transactionId: string
  amount: number
  currency: string
  courseName: string
  courseId: number
  paymentMethod: string
  completedAt: string
  dashboardUrl: string
  courseUrl: string
  failureReason?: string
}

// Welcome email data
export interface WelcomeEmailData {
  firstName: string
  lastName: string
  email: string
  dashboardUrl: string
}

// Admin notification email data
export interface AdminNotificationEmailData {
  userName: string
  userEmail: string
  courseName?: string
  courseId?: number
  transactionId?: string
  amount?: number
  currency?: string
  enrollmentDate?: string
  paymentDate?: string
  adminDashboardUrl: string
}

// Service configuration
export interface EmailServiceConfig {
  fromEmail: string
  fromName: string
  replyTo?: string
}

// SendGrid response
export interface SendGridResponse {
  success: boolean
  messageId?: string
  error?: string
}

// Brand settings for emails
export interface EmailBrandSettings {
  platformName: string
  logoUrl?: string
  logoWhite?: string
  supportEmail?: string
  appUrl: string
}
