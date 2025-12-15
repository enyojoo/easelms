# EaseLMS - Comprehensive Build Plan

## Executive Summary

This document outlines the complete plan for building the EaseLMS (Enthronement University LMS) from its current prototype state to a production-ready Learning Management System.

## Current State Analysis

### ✅ What's Already Built

1. **Frontend Architecture**
   - Next.js 16 with App Router
   - TypeScript setup
   - Monorepo structure with Turbo
   - Complete UI component library (shadcn/ui)
   - Responsive design with Tailwind CSS
   - Theme support (dark/light mode)

2. **User Interface Pages**
   - **Admin Panel:**
     - Dashboard with analytics placeholders
     - Course creation/editing interface
     - Learner management
     - Reports and analytics UI
     - Settings (branding, payments, team management)
   - **Learner Portal:**
     - Dashboard
     - Course catalog
     - Course learning interface with video player
     - Quiz components
     - Achievements page
     - Profile and settings

3. **Authentication Structure**
   - Cookie-based auth system (skeleton)
   - Separate admin and learner login pages
   - Middleware for route protection
   - User type differentiation (admin/learner)

4. **Data Models**
   - TypeScript interfaces for:
     - Users
     - Courses/Modules
     - Lessons
     - Quizzes
     - Resources
     - Certificates

### ❌ What's Missing (Critical Gaps)

1. **No Database**
   - Currently using in-memory arrays (`data/courses.ts`, `data/users.ts`)
   - No persistence layer
   - No data relationships

2. **No API Layer**
   - No Next.js API routes
   - No backend logic
   - All data is client-side only

3. **No Real Authentication**
   - Cookie-based but no password hashing
   - No session management
   - No JWT or secure tokens
   - No email verification

4. **No File Storage**
   - No video hosting
   - No image upload handling
   - No document storage

5. **No Payment Integration**
   - Payment UI exists but no gateway integration
   - No transaction handling
   - No subscription management

6. **No Real-time Features**
   - Supabase Realtime not configured
   - No live chat/support
   - No real-time notifications

7. **No Email System**
   - No email notifications
   - No password reset emails
   - No course enrollment emails

8. **No Certificate Generation**
   - Certificate UI exists but no PDF generation

9. **No Analytics/Reporting Backend**
   - UI exists but no data collection
   - No tracking system

---

## Development Approach: UI-First Strategy

**Important:** We will complete all UI pages and components first before building backend functionality. This ensures:
- Clear visual requirements
- Better user experience design
- Easier backend integration later
- Ability to demo and get feedback early

---

## Phase 0: UI Completion & Polish (Weeks 1-2) - **START HERE**

### 0.1 UI Completion Checklist

**Goal:** Complete all UI pages with mock data before any backend work.

#### Admin Panel Pages
- [ ] **Dashboard** (`/admin/dashboard`)
  - [ ] Analytics cards (revenue, learners, courses)
  - [ ] Recent activity feed
  - [ ] Quick actions
  - [ ] Charts and graphs (using mock data)
  - [ ] Responsive design

- [ ] **Course Management** (`/admin/courses`)
  - [ ] Course list/grid view
  - [ ] Course creation form (`/admin/courses/new`)
    - [ ] Basic info tab
    - [ ] Lesson builder with drag-and-drop
    - [ ] Quiz builder
    - [ ] Course settings (enrollment, certificates)
    - [ ] Preview tab
  - [ ] Course editing
  - [ ] Course deletion
  - [ ] Course preview (`/admin/courses/preview/[id]`)
  - [ ] Search and filters

- [ ] **Learner Management** (`/admin/learners`)
  - [ ] Learner list/table
  - [ ] Learner details view
  - [ ] Enrollment management
  - [ ] Progress tracking
  - [ ] Search and filters

- [ ] **Reports** (`/admin/reports`)
  - [ ] Revenue reports with charts
  - [ ] Learner analytics
  - [ ] Course performance
  - [ ] Completion rates
  - [ ] Export functionality (UI only)
  - [ ] Date range filters

- [ ] **Settings** (`/admin/settings`)
  - [ ] Branding settings
  - [ ] Logo management
  - [ ] Custom domain settings
  - [ ] Payment gateway settings (Stripe/Flutterwave)
  - [ ] Payment settings (currency, pricing)
  - [ ] Team management
  - [ ] User management
  - [ ] Subscription management

- [ ] **Admin Profile** (`/admin/profile`)
  - [ ] Profile information
  - [ ] Social links
  - [ ] Password change

#### Learner Portal Pages
- [ ] **Dashboard** (`/learner/dashboard`)
  - [ ] Welcome message
  - [ ] Courses in progress
  - [ ] Recommended courses
  - [ ] Recent activity
  - [ ] Progress overview

- [ ] **Course Catalog** (`/learner/courses`)
  - [ ] Course grid/list view
  - [ ] Course cards with thumbnails
  - [ ] Search and filters
  - [ ] Category filtering
  - [ ] Course preview modal

- [ ] **Course Details** (`/learner/courses/[id]`)
  - [ ] Course overview
  - [ ] Course curriculum
  - [ ] Instructor info
  - [ ] Reviews/ratings (UI)
  - [ ] Enrollment button
  - [ ] Price display (with currency conversion UI)

- [ ] **Course Learning** (`/learner/courses/[id]/learn`)
  - [ ] Video player component
  - [ ] Lesson navigation sidebar
  - [ ] Lesson content display
  - [ ] Quiz component
  - [ ] Resources panel
  - [ ] Achievements panel
  - [ ] Progress tracking UI
  - [ ] Next/Previous lesson navigation

- [ ] **Course Summary** (`/learner/courses/[id]/learn/summary`)
  - [ ] Completion message
  - [ ] Certificate download button (UI)
  - [ ] Course stats
  - [ ] Next steps

- [ ] **Achievements** (`/learner/achievements`)
  - [ ] Achievement badges
  - [ ] Progress indicators
  - [ ] Achievement details

- [ ] **Profile** (`/learner/profile`)
  - [ ] Profile information
  - [ ] Enrolled courses
  - [ ] Completed courses
  - [ ] Certificates
  - [ ] Social links

- [ ] **Settings** (`/learner/settings`)
  - [ ] Account settings
  - [ ] Notification preferences
  - [ ] Currency selection
  - [ ] Password change
  - [ ] Payment methods (UI)

#### Authentication Pages
- [ ] **Learner Login** (`/auth/learner/login`)
  - [ ] Login form
  - [ ] "Forgot password" link
  - [ ] "Sign up" link
  - [ ] Error handling UI

- [ ] **Learner Signup** (`/auth/learner/signup`)
  - [ ] Registration form
  - [ ] Email verification message
  - [ ] Terms and conditions
  - [ ] Error handling UI

- [ ] **Admin Login** (`/auth/admin/login`)
  - [ ] Admin login form
  - [ ] Error handling UI

- [ ] **Forgot Password** (`/forgot-password`)
  - [ ] Email input form
  - [ ] Code verification (`/forgot-password/code`)
  - [ ] New password form (`/forgot-password/new-password`)

#### Shared Pages
- [ ] **Support** (`/support`)
  - [ ] Support form
  - [ ] FAQ section
  - [ ] Contact information

- [ ] **404 Page**
- [ ] **500 Error Page**

### 0.2 Component Library Completion

Ensure all reusable components are built:
- [ ] All shadcn/ui components are properly configured
- [ ] Custom components:
  - [ ] Video player component
  - [ ] Quiz component
  - [ ] Course card component
  - [ ] Progress bar component
  - [ ] Certificate preview component
  - [ ] File upload component
  - [ ] Currency converter display component
  - [ ] Payment form component (Stripe/Flutterwave UI)

### 0.3 UI/UX Polish

- [ ] **Responsive Design**
  - [ ] Mobile-first approach
  - [ ] Tablet layouts
  - [ ] Desktop layouts
  - [ ] Test on multiple screen sizes

- [ ] **Loading States**
  - [ ] Skeleton loaders
  - [ ] Loading spinners
  - [ ] Empty states
  - [ ] Error states

- [ ] **Animations**
  - [ ] Page transitions
  - [ ] Button interactions
  - [ ] Form validations
  - [ ] Success/error messages

- [ ] **Theme Support**
  - [ ] Dark mode fully functional
  - [ ] Light mode fully functional
  - [ ] Theme persistence

### 0.4 Mock Data Setup

Create comprehensive mock data for all pages:
- [ ] Mock users (admin, learners)
- [ ] Mock courses with full content
- [ ] Mock lessons with videos
- [ ] Mock quizzes
- [ ] Mock enrollments
- [ ] Mock progress data
- [ ] Mock payments
- [ ] Mock certificates
- [ ] Mock achievements
- [ ] Mock analytics data

### 0.5 UI Testing & Review

- [ ] **Visual Testing**
  - [ ] All pages render correctly
  - [ ] No layout breaks
  - [ ] Images load properly
  - [ ] Forms are functional (client-side)

- [ ] **User Flow Testing**
  - [ ] Complete user journeys
  - [ ] Navigation flows
  - [ ] Form submissions (mock)
  - [ ] Modal interactions

- [ ] **Browser Testing**
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge

- [ ] **Device Testing**
  - [ ] Mobile devices
  - [ ] Tablets
  - [ ] Desktop

### 0.6 Documentation

- [ ] Document all UI components
- [ ] Create style guide
- [ ] Document color scheme
- [ ] Document typography
- [ ] Document spacing system

### 0.7 Deliverables

By end of Phase 0, you should have:
- ✅ All UI pages complete and functional (with mock data)
- ✅ All components built and reusable
- ✅ Responsive design implemented
- ✅ Dark/light theme working
- ✅ All user flows testable
- ✅ Ready for backend integration

**Timeline:** 2 weeks

**Next Step:** Once UI is complete, proceed to Phase 1 (Database Setup) and connect real data.

---

## Phase 1: Foundation & Database Setup (Weeks 3-4)

### 1.1 Database Selection & Setup

**Using: Supabase (PostgreSQL + Auth + Backend)**

**Why Supabase:**
- Built-in authentication system
- PostgreSQL database with real-time capabilities
- Optional file storage (using AWS S3 instead)
- Auto-generated REST APIs
- Row Level Security (RLS) for data protection
- Excellent Next.js integration
- Free tier for development

**Database Approach:**
- Use Supabase client library for direct database access
- Supabase client provides TypeScript types automatically
- Leverage Supabase's built-in features (auth, real-time)
- Use AWS S3 for file storage

### 1.2 Database Schema Design

**Important:** The schema below is shown in a conceptual format for documentation purposes. You must implement this directly in Supabase using SQL CREATE TABLE statements. Supabase will automatically generate TypeScript types from your SQL schema - no Prisma needed.

**Core Tables:**

```typescript
// CONCEPTUAL SCHEMA - Convert to SQL in Supabase SQL Editor
// This shows the data structure. Implement as SQL CREATE TABLE statements.
// Supabase will auto-generate TypeScript types from your SQL schema.

// User Management
interface User {
  id: string  // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  email: string  // UNIQUE NOT NULL
  name: string  // NOT NULL
  passwordHash: string  // NOT NULL
  userType: 'LEARNER' | 'ADMIN' | 'INSTRUCTOR'  // DEFAULT 'LEARNER'
  profileImage?: string
  currency: string  // DEFAULT 'USD'
  emailVerified: boolean  // DEFAULT false
  createdAt: Date  // DEFAULT now()
  updatedAt: Date  // DEFAULT now(), auto-updated
}

// Course Management
model Course {
  id                      String   @id @default(cuid())
  title                   String
  description             String
  thumbnail               String?
  previewVideo            String?
  requirements            String?
  whoIsThisFor            String?
  price                   Decimal?
  currency                String   @default("USD")
  enrolledStudents        Int      @default(0)
  isPublished             Boolean  @default(false)
  requiresSequentialProgress Boolean @default(true)
  minimumQuizScore        Int      @default(50)
  enrollmentMode          EnrollmentMode @default(FREE)
  recurringPrice          Decimal?  // Always in USD (base currency)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  // Relations
  modules                 Module[]
  enrollments             Enrollment[]
  payments                Payment[]
  certificates            Certificate[]
  settings                CourseSettings?
}

enum EnrollmentMode {
  FREE
  BUY
  RECURRING
}

// Module/Lesson Structure
model Module {
  id          String   @id @default(cuid())
  courseId    String
  title       String
  description String?
  order       Int
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons     Lesson[]
}

model Lesson {
  id              String   @id @default(cuid())
  moduleId        String
  title           String
  type            LessonType @default(VIDEO)
  content         Json?      // Flexible content storage
  order           Int
  isRequired      Boolean  @default(true)
  videoProgression Boolean @default(true)
  allowSkip       Boolean  @default(false)
  timeLimit       Int?
  module          Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  progress        Progress[]
  quiz            Quiz?
  resources       Resource[]
}

enum LessonType {
  VIDEO
  TEXT
  QUIZ
  ASSIGNMENT
  LIVE
}

// Quiz System
model Quiz {
  id                String   @id @default(cuid())
  lessonId          String   @unique
  enabled           Boolean  @default(false)
  passingScore      Int      @default(70)
  questions         Question[]
  lesson            Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  attempts          QuizAttempt[]
}

model Question {
  id          String   @id @default(cuid())
  quizId      String
  question    String
  options     Json     // Array of strings
  correctAnswer Int
  order       Int
  quiz        Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
}

// Enrollment & Progress
model Enrollment {
  id          String   @id @default(cuid())
  userId      String
  courseId    String
  enrolledAt  DateTime @default(now())
  completedAt DateTime?
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  progress    Progress[]
  
  @@unique([userId, courseId])
}

model Progress {
  id          String   @id @default(cuid())
  enrollmentId String
  lessonId    String
  completed   Boolean  @default(false)
  completedAt DateTime?
  timeSpent   Int?     // in seconds
  enrollment  Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  lesson      Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  
  @@unique([enrollmentId, lessonId])
}

// Quiz Attempts
model QuizAttempt {
  id          String   @id @default(cuid())
  quizId      String
  userId      String
  score       Int
  answers     Json     // User's answers
  completedAt DateTime @default(now())
  quiz        Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Resources
model Resource {
  id        String   @id @default(cuid())
  lessonId  String
  type      ResourceType
  title     String
  url       String
  lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

enum ResourceType {
  DOCUMENT
  LINK
  VIDEO
}

// Certificates
model Certificate {
  id          String   @id @default(cuid())
  userId      String
  courseId    String
  certificateUrl String
  issuedAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  @@unique([userId, courseId])
}

// Achievements
model Achievement {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String?
  icon        String?
  earnedAt    DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Payments
model Payment {
  id            String   @id @default(cuid())
  userId        String
  courseId      String?
  amountUSD     Decimal  // Original price in USD (base currency)
  amount        Decimal  // Converted amount in user's currency
  currency      String   // User's currency (NGN, USD, EUR, etc.)
  exchangeRate  Decimal  // Exchange rate used at time of payment
  gateway       String   // "stripe" or "flutterwave"
  status        PaymentStatus
  paymentMethod String?
  transactionId String?
  createdAt     DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  course        Course?  @relation(fields: [courseId], references: [id], onDelete: SetNull)
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

// Settings
model CourseSettings {
  id                    String   @id @default(cuid())
  courseId              String   @unique
  certificateEnabled    Boolean  @default(false)
  certificateTemplate   String?
  certificateDescription String?
  signatureImage        String?
  signatureTitle        String?
  additionalText        String?
  certificateType       CertificateType @default(COMPLETION)
  course                Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
}

enum CertificateType {
  COMPLETION
  ACHIEVEMENT
  PARTICIPATION
}

model SocialLinks {
  id      String   @id @default(cuid())
  userId  String   @unique
  website String?
  twitter String?
  linkedin String?
  youtube String?
  instagram String?
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 1.3 Supabase Setup Steps

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Install Supabase Client:**
   ```bash
   cd apps/lms
   npm install @supabase/supabase-js
   ```

3. **Configure Environment Variables:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=your-postgres-connection-string
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=your-bucket-name
   AWS_CLOUDFRONT_DOMAIN=your-cloudfront-domain
   ```

4. **Create Database Schema:**
   - Use Supabase SQL Editor to create tables
   - Set up Row Level Security (RLS) policies
   - Create necessary indexes
   - Supabase will auto-generate TypeScript types

5. **Initialize Supabase Client:**
   - Create `lib/supabase/client.ts` for client-side
   - Create `lib/supabase/server.ts` for server-side

---

## Phase 2: Authentication & Authorization (Week 3)

### 2.1 Secure Authentication System

**Using: Supabase Auth**

**Why Supabase Auth:**
- Built-in authentication system
- Email/password, OAuth, magic links
- Email verification included
- Password reset flows
- Session management handled
- JWT tokens automatically managed
- Row Level Security integration

### 2.2 Implementation Steps

1. **Install Supabase Auth Helpers:**
   ```bash
   npm install @supabase/auth-helpers-nextjs
   npm install @supabase/ssr
   ```

2. **Configure Supabase Auth:**
   - Enable email/password auth in Supabase dashboard
   - Configure email templates
   - Set up OAuth providers (optional)
   - Configure redirect URLs

3. **Create Auth Utilities:**
   - Update `utils/server-auth.ts` to use Supabase
   - Update `utils/client-auth.ts` to use Supabase
   - Create auth middleware using Supabase

4. **Update Auth Pages:**
   - `/auth/learner/login` - Use Supabase signIn
   - `/auth/learner/signup` - Use Supabase signUp
   - `/auth/admin/login` - Use Supabase with role check
   - `/forgot-password` - Use Supabase resetPasswordForEmail

5. **User Metadata & Roles:**
   - Store `userType` in Supabase user metadata
   - Create database function to check user roles
   - Set up RLS policies based on user roles

6. **Security Features:**
   - Password strength validation (client-side)
   - Rate limiting (Supabase handles this)
   - Email verification (built-in)
   - Secure session management (handled by Supabase)
   - CSRF protection (built-in)

---

## Phase 3: API Layer Development (Weeks 4-5)

### 3.1 API Route Structure

Create Next.js API routes in `app/api/`:

**Course Management:**
- `GET /api/courses` - List all courses
- `GET /api/courses/[id]` - Get course details
- `POST /api/courses` - Create course (admin only)
- `PUT /api/courses/[id]` - Update course (admin only)
- `DELETE /api/courses/[id]` - Delete course (admin only)
- `GET /api/courses/[id]/preview` - Preview course

**Enrollment:**
- `POST /api/enrollments` - Enroll in course
- `GET /api/enrollments` - Get user enrollments
- `DELETE /api/enrollments/[id]` - Unenroll

**Progress Tracking:**
- `GET /api/progress/[enrollmentId]` - Get course progress
- `POST /api/progress/lesson` - Mark lesson complete
- `PUT /api/progress/lesson` - Update lesson progress

**Quiz System:**
- `GET /api/quizzes/[lessonId]` - Get quiz
- `POST /api/quizzes/[quizId]/attempt` - Submit quiz attempt
- `GET /api/quizzes/attempts/[userId]` - Get user attempts

**User Management:**
- `GET /api/users` - List users (admin only)
- `GET /api/users/[id]` - Get user profile
- `PUT /api/users/[id]` - Update profile
- `DELETE /api/users/[id]` - Delete user (admin only)

**Payments:**
- `GET /api/payments/convert-price` - Convert USD price to user currency
- `POST /api/payments/create-intent` - Create payment intent (Stripe or Flutterwave)
- `POST /api/payments/stripe-webhook` - Handle Stripe webhooks
- `POST /api/payments/flutterwave-webhook` - Handle Flutterwave webhooks
- `GET /api/payments/history` - Get payment history

**Certificates:**
- `GET /api/certificates` - Get user certificates
- `POST /api/certificates/generate` - Generate certificate

**Analytics:**
- `GET /api/analytics/revenue` - Revenue data
- `GET /api/analytics/learners` - Learner statistics
- `GET /api/analytics/completion` - Completion rates

### 3.2 API Best Practices

1. **Input Validation:**
   - Use Zod schemas for request validation
   - Validate all inputs before processing

2. **Error Handling:**
   - Consistent error response format
   - Proper HTTP status codes
   - Error logging

3. **Rate Limiting:**
   - Implement rate limiting on sensitive endpoints
   - Use middleware for protection

4. **Authentication Middleware:**
   - Protect routes with auth checks
   - Role-based authorization

---

## Phase 4: File Storage & Media Management (Week 6)

### 4.1 File Storage Solution

**Using: AWS S3 + CloudFront**

**Why AWS S3:**
- Industry-standard object storage
- Highly scalable and reliable
- Cost-effective at scale
- Fine-grained access control (IAM policies)
- Integration with CloudFront CDN
- Lifecycle management for cost optimization
- Versioning and backup capabilities

**Setup:**
- AWS S3 for storage
- CloudFront CDN for fast global delivery
- Optional: AWS Lambda for image/video processing

### 4.2 Implementation

1. **AWS Setup:**
   - Create AWS account (if not already)
   - Set up S3 buckets
   - Configure CloudFront distribution
   - Set up IAM user with S3 permissions
   - Configure CORS for browser uploads

2. **Install AWS SDK:**
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```

3. **Create S3 Buckets:**
   - `course-thumbnails` - Course images
   - `course-videos` - Video content
   - `course-documents` - PDFs and documents
   - `user-avatars` - Profile images
   - `certificates` - Generated certificates

4. **Create Upload API Routes:**
   - `POST /api/upload/image` - Image upload to S3
   - `POST /api/upload/video` - Video upload to S3
   - `POST /api/upload/document` - Document upload
   - `POST /api/upload/presigned-url` - Generate presigned URL for direct client uploads
   - `DELETE /api/upload/[key]` - Delete file from S3

5. **Access Control:**
   - Use IAM policies for bucket access
   - Presigned URLs for temporary access
   - CloudFront signed URLs for secure content delivery
   - Public read for course content (via CloudFront)
   - Private buckets for sensitive content

6. **File Management:**
   - Track file metadata in Supabase database
   - Store S3 keys/URLs in database
   - Implement file cleanup on deletion
   - Use CloudFront URLs for delivery
   - Set up S3 lifecycle policies for cost optimization
   - Optional: Use AWS Lambda for image optimization

7. **Environment Variables:**
   ```env
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=your-bucket-name
   AWS_CLOUDFRONT_DOMAIN=your-cloudfront-domain
   ```

---

## Phase 5: Payment Integration (Week 7)

### 5.1 Payment Gateway Selection

**Multi-Gateway Approach:**

1. **Stripe** - For global payments (all currencies except NGN)
   - Excellent documentation
   - Supports subscriptions
   - Webhook system
   - Multi-currency support
   - PCI compliance handled

2. **Flutterwave** - For Nigeria (NGN/Naira)
   - Local payment methods in Nigeria
   - Bank transfers, cards, mobile money
   - Better acceptance rates in Nigeria
   - Naira support

**Currency & Pricing Model:**
- **Admin sets all prices in USD** (base currency)
- **Users see prices in their profile currency** (converted using exchange rates)
- **Checkout happens in user's currency** with real-time exchange rate conversion
- **Gateway selection** is automatic based on user's currency:
  - NGN (Naira) → Flutterwave
  - All other currencies → Stripe

### 5.2 Currency Conversion

**Exchange Rate Service:**
- Use a reliable exchange rate API (e.g., ExchangeRate-API, Fixer.io, or CurrencyLayer)
- Cache exchange rates (update hourly/daily)
- Store conversion rate used at time of payment
- Display converted price to user before checkout

**Implementation:**
1. Fetch user's currency from profile
2. Get current exchange rate (USD → User Currency)
3. Convert course price (USD) to user's currency
4. Display converted price to user
5. Process payment in user's currency

### 5.3 Implementation Steps

1. **Install Dependencies:**
   ```bash
   npm install stripe flutterwave-node-v3
   npm install axios  # For exchange rate API
   ```

2. **Update Payment Table:**
   Add columns to track original USD amount and conversion:
   ```sql
   -- Add these columns to the payments table:
   ALTER TABLE payments ADD COLUMN amount_usd DECIMAL;
   ALTER TABLE payments ADD COLUMN amount DECIMAL;
   ALTER TABLE payments ADD COLUMN currency TEXT;
   ALTER TABLE payments ADD COLUMN exchange_rate DECIMAL;
   ALTER TABLE payments ADD COLUMN gateway TEXT;  -- 'stripe' or 'flutterwave'
   ```

3. **Create Exchange Rate Service:**
   - `lib/exchange-rates.ts` - Fetch and cache exchange rates
   - Cache rates in database or Redis
   - Update rates periodically (cron job or scheduled function)

4. **Create Payment API Routes:**
   - `GET /api/payments/convert-price` - Convert USD price to user currency
   - `POST /api/payments/create-intent` - Create payment intent (Stripe or Flutterwave)
   - `POST /api/payments/stripe-webhook` - Handle Stripe webhooks
   - `POST /api/payments/flutterwave-webhook` - Handle Flutterwave webhooks
   - `GET /api/payments/history` - Get payment history

5. **Gateway Selection Logic:**
   ```typescript
   function selectGateway(userCurrency: string): 'stripe' | 'flutterwave' {
     return userCurrency === 'NGN' ? 'flutterwave' : 'stripe'
   }
   ```

6. **Payment Flow:**
   - **Price Display:**
     1. Admin sets course price in USD
     2. User views course → Fetch user's currency
     3. Get exchange rate (USD → User Currency)
     4. Convert and display price in user's currency
   
   - **Checkout:**
     1. User initiates checkout
     2. Get current exchange rate
     3. Convert USD price to user's currency
     4. Select gateway based on currency
     5. Create payment intent with converted amount
     6. Process payment in user's currency
     7. Store original USD amount, converted amount, and exchange rate

7. **Subscription Management:**
   - Handle recurring payments (both gateways support subscriptions)
   - Convert recurring price at each billing cycle
   - Update subscription if exchange rate changes significantly

8. **Security:**
   - Verify webhook signatures (both gateways)
   - Never expose secret keys
   - Use test mode for development
   - Validate exchange rates to prevent manipulation
   - Store conversion rate at payment time (prevent disputes)

### 5.4 Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Flutterwave
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key
FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public-key
FLUTTERWAVE_WEBHOOK_SECRET=your-flutterwave-webhook-secret

# Exchange Rate API
EXCHANGE_RATE_API_KEY=your-exchange-rate-api-key
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest/USD
```

---

## Phase 6: Real-time Features (Week 8)

### 6.1 Supabase Realtime Implementation

**Using: Supabase Realtime (Built-in)**

**Why Supabase Realtime:**
- Built into Supabase (no additional service needed)
- PostgreSQL change listeners
- Real-time subscriptions
- Automatic reconnection
- Works with Row Level Security

**Use Cases:**
- Live chat/support
- Real-time notifications
- Live course sessions
- Progress updates
- Course updates broadcast

### 6.2 Setup Steps

1. **Enable Realtime in Supabase:**
   - Enable Realtime for specific tables in Supabase dashboard
   - Configure publication settings
   - Set up RLS policies for real-time access

2. **Client Integration:**
   - Use Supabase client's `.channel()` API
   - Subscribe to database changes
   - Handle connection events (automatic reconnection)

3. **Features to Implement:**
   - **Support Chat:** Real-time messaging using a messages table
   - **Notifications:** Subscribe to user notifications table
   - **Course Updates:** Broadcast course changes to enrolled users
   - **Progress Sync:** Real-time progress updates across devices
   - **Live Sessions:** Use Supabase Realtime + WebRTC for live courses

4. **Implementation Example:**
   ```typescript
   // Subscribe to course updates
   const channel = supabase
     .channel('course-updates')
     .on('postgres_changes', {
       event: 'UPDATE',
       schema: 'public',
       table: 'courses',
       filter: `id=eq.${courseId}`
     }, (payload) => {
       // Handle course update
     })
     .subscribe()
   ```

---

## Phase 7: Email System (Week 9)

### 7.1 Email Service Selection

**Recommended: Resend or SendGrid**

**Why Resend:**
- Great developer experience
- React email templates
- Good free tier

**Alternatives:**
- SendGrid
- AWS SES
- Mailgun

### 7.2 Email Templates

Create templates for:
- Welcome email
- Email verification
- Password reset
- Course enrollment confirmation
- Course completion
- Certificate issuance
- Payment receipts
- Course updates

### 7.3 Implementation

1. **Install Email Library:**
   ```bash
   npm install resend
   npm install react-email @react-email/components
   ```

2. **Create Email Service:**
   - Email utility functions
   - Template components
   - Queue system for bulk emails

3. **Integrate with Events:**
   - User registration → Welcome email
   - Course enrollment → Confirmation
   - Course completion → Certificate email

---

## Phase 8: Certificate Generation (Week 10)

### 8.1 PDF Generation

**Recommended: PDFKit or Puppeteer**

### 8.2 Implementation

1. **Install Library:**
   ```bash
   npm install pdfkit
   # or
   npm install puppeteer
   ```

2. **Create Certificate Template:**
   - Design certificate layout
   - Dynamic content insertion
   - Signature/image support

3. **API Route:**
   - `POST /api/certificates/generate` - Generate PDF
   - Store certificate URL in database
   - Upload to storage service

4. **Features:**
   - Customizable templates
   - QR code for verification
   - Download functionality

---

## Phase 9: Analytics & Reporting (Week 11)

### 9.1 Analytics Implementation

**Using: PostHog**

**Why PostHog:**
- Product analytics with event tracking
- Feature flags for gradual rollouts
- Session replay for debugging
- User behavior insights
- Funnel analysis
- Cohort analysis
- Free tier available

1. **PostHog Setup:**
   ```bash
   npm install posthog-js
   ```
   - Initialize PostHog in Next.js app
   - Configure event tracking
   - Set up feature flags
   - Enable session replay (optional)

2. **Data Collection:**
   - Track user actions with PostHog events
   - Course engagement metrics
   - Revenue tracking
   - Completion rates
   - User journey tracking

3. **Analytics Dashboard:**
   - Use PostHog dashboard for insights
   - Replace mock data with PostHog queries
   - Create custom dashboards in PostHog
   - Build internal admin dashboard using PostHog API

4. **Reports:**
   - Revenue reports (PostHog + custom queries)
   - Learner analytics
   - Course performance
   - Export functionality (CSV/PDF from PostHog)

5. **Feature Flags:**
   - Use PostHog feature flags for A/B testing
   - Gradual feature rollouts
   - Feature toggles for admin

### 9.2 Tracking Events

Track these events in PostHog:
- Page views (automatic)
- Video watch time
- Quiz attempts
- Course enrollments
- Payments
- Certificate generation
- User signups/logins
- Course completions
- Lesson progress

---

## Phase 10: Testing & Quality Assurance (Week 12)

### 10.1 Testing Strategy

1. **Unit Tests:**
   - Test utility functions
   - Test API route handlers
   - Test business logic

2. **Integration Tests:**
   - Test API endpoints
   - Test database operations
   - Test authentication flows

3. **E2E Tests:**
   - Test user journeys
   - Test course creation flow
   - Test enrollment process

### 10.2 Testing Tools

- **Jest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** - E2E testing
- **Supertest** - API testing

### 10.3 Code Quality

- ESLint configuration
- Prettier setup
- TypeScript strict mode
- Pre-commit hooks (Husky)

---

## Phase 11: Performance Optimization (Week 13)

### 11.1 Frontend Optimization

1. **Image Optimization:**
   - Next.js Image component
   - Lazy loading
   - Responsive images

2. **Code Splitting:**
   - Dynamic imports
   - Route-based splitting
   - Component lazy loading

3. **Caching:**
   - React Query for data caching
   - Static page generation where possible
   - ISR for course pages

### 11.2 Backend Optimization

1. **Database:**
   - Add indexes
   - Query optimization
   - Connection pooling

2. **API:**
   - Response caching
   - Pagination
   - Data aggregation optimization

---

## Phase 12: Deployment & DevOps (Week 14)

### 12.1 Deployment Strategy

**Using: Vercel**

**Why Vercel:**
- Excellent Next.js support
- Automatic deployments from GitHub
- Edge functions
- Built-in analytics
- Preview deployments for PRs
- Zero-configuration deployment

### 12.2 Environment Setup

1. **Environment Variables in Vercel:**
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
   - `DATABASE_URL` - PostgreSQL connection string (optional, for direct DB access)
   - `AWS_ACCESS_KEY_ID` - AWS access key for S3
   - `AWS_SECRET_ACCESS_KEY` - AWS secret key for S3
   - `AWS_REGION` - AWS region (e.g., us-east-1)
   - `AWS_S3_BUCKET_NAME` - S3 bucket name
   - `AWS_CLOUDFRONT_DOMAIN` - CloudFront distribution domain
   - `STRIPE_SECRET_KEY` - Stripe API key
   - `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
   - `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
   - `FLUTTERWAVE_SECRET_KEY` - Flutterwave secret key
   - `FLUTTERWAVE_PUBLIC_KEY` - Flutterwave public key
   - `FLUTTERWAVE_WEBHOOK_SECRET` - Flutterwave webhook secret
   - `EXCHANGE_RATE_API_KEY` - Exchange rate API key
   - `EXCHANGE_RATE_API_URL` - Exchange rate API endpoint
   - `RESEND_API_KEY` - Email service key
   - `NEXT_PUBLIC_POSTHOG_KEY` - PostHog project API key
   - `NEXT_PUBLIC_POSTHOG_HOST` - PostHog host URL (e.g., https://app.posthog.com)
   - Other service API keys

2. **Vercel Configuration:**
   - Connect GitHub repository
   - Configure build settings (auto-detected for Next.js)
   - Set up environment variables for production, preview, development
   - Configure custom domains (if needed)

3. **CI/CD Pipeline:**
   - Automatic deployments on push to main
   - Preview deployments for pull requests
   - Automated testing (can add GitHub Actions)
   - Deployment automation handled by Vercel

4. **Monitoring:**
   - PostHog for product analytics, feature flags, and session replay
   - Error tracking and performance monitoring (PostHog)
   - Supabase dashboard for database monitoring
   - Vercel Analytics (optional, built-in)

### 12.3 Database & Backend Hosting

**Using: Supabase**
- Database: PostgreSQL (hosted by Supabase)
- Authentication: Supabase Auth
- Backend: Supabase Edge Functions (optional) + Next.js API Routes
- Real-time: Supabase Realtime (built-in)

**File Storage:**
- AWS S3 for object storage
- CloudFront CDN for content delivery

---

## Technology Stack Summary

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI)
- **State Management:** React Context + useState
- **Forms:** React Hook Form + Zod
- **Animations:** Framer Motion

### Backend
- **Runtime:** Node.js
- **Database:** Supabase (PostgreSQL)
- **ORM:** Supabase Client (native, with built-in TypeScript types)
- **Authentication:** Supabase Auth
- **API:** Next.js API Routes + Supabase Edge Functions (optional)
- **Storage:** AWS S3 + CloudFront

### Services
- **File Storage:** AWS S3 + CloudFront
- **Payments:** Stripe (global) + Flutterwave (Nigeria/NGN)
- **Email:** Resend (or Supabase built-in email)
- **Real-time:** Supabase Realtime (built-in)
- **Analytics:** PostHog (product analytics, feature flags, session replay)

### DevOps
- **Hosting:** Vercel
- **Database & Backend:** Supabase
- **CI/CD:** Vercel (automatic) + GitHub Actions (optional)
- **Monitoring:** PostHog (analytics, error tracking, session replay)

---

## Development Priorities

### Phase 0 - Weeks 1-2: UI First (START HERE)
1. ✅ Complete all UI pages
2. ✅ Build all components
3. ✅ Implement responsive design
4. ✅ Set up mock data
5. ✅ Polish UX/UI
6. ✅ Test all user flows

### MVP (Minimum Viable Product) - Weeks 3-10
1. ✅ Database setup (Weeks 3-4)
2. ✅ Authentication (Week 5)
3. ✅ Basic API routes (Week 6)
4. ✅ File uploads (Week 7)
5. ✅ Payment integration (Week 8)
6. ✅ Core course functionality (Weeks 9-10)

### Phase 2 - Weeks 11-14
1. Real-time features (Week 11)
2. Email system (Week 12)
3. Certificate generation (Week 13)
4. Analytics (Week 14)

### Phase 3 - Weeks 15-16
1. Testing
2. Performance optimization
3. Deployment
4. Documentation

---

## Estimated Timeline

- **Total Development Time:** 16 weeks (4 months)
- **Team Size:** 1-2 developers
- **UI Complete:** 2 weeks (Phase 0)
- **MVP Ready:** 10 weeks (including UI)
- **Production Ready:** 16 weeks

---

## Risk Mitigation

1. **Database Migration:** Use Supabase migrations (SQL) for safe schema changes
2. **Payment Security:** Follow Stripe and Flutterwave best practices, verify webhook signatures, validate exchange rates to prevent manipulation
3. **File Storage Costs:** Implement cleanup policies, optimize file sizes
4. **Scalability:** Design with scalability in mind from the start
5. **Data Backup:** Set up automated database backups

---

## Next Steps

1. **Immediate Actions (Phase 0 - UI First):**
   - Review all existing UI pages
   - Complete missing UI pages
   - Polish all components
   - Set up comprehensive mock data
   - Test all user flows
   - Get UI/UX approval

2. **After UI Complete (Phase 1):**
   - Set up development environment
   - Create Supabase project
   - Configure Supabase client
   - Create database schema using Supabase SQL Editor
   - Connect UI to real data (replace mock data)

3. **Communication:**
   - Daily standups
   - Weekly progress reviews
   - Document decisions

---

## Additional Considerations

### Security Checklist
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Supabase client uses parameterized queries)
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Secure password hashing
- [ ] HTTPS only
- [ ] Secure cookie settings
- [ ] Environment variable security


### SEO (for public website)
- [ ] Meta tags
- [ ] Open Graph tags
- [ ] Sitemap
- [ ] Structured data

---

This plan provides a comprehensive roadmap for building the EaseLMS. Adjust timelines and priorities based on your specific requirements and resources.

