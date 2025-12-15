# Component Documentation

This document provides an overview of all custom components in the Enthronement LMS application.

## UI Components

### EmptyState
A reusable component for displaying empty states when there's no data to show.

**Location:** `apps/lms/components/EmptyState.tsx`

**Props:**
- `icon?: LucideIcon` - Optional icon to display
- `title: string` - Title text
- `description?: string` - Optional description text
- `actionLabel?: string` - Optional action button label
- `onAction?: () => void` - Optional action button handler
- `className?: string` - Optional additional CSS classes

**Usage:**
```tsx
<EmptyState
  icon={BookOpen}
  title="No courses found"
  description="Get started by creating your first course"
  actionLabel="Create Course"
  onAction={() => router.push('/admin/courses/new')}
/>
```

### ErrorState
A component for displaying error messages with retry functionality.

**Location:** `apps/lms/components/ErrorState.tsx`

**Props:**
- `title?: string` - Error title (default: "Something went wrong")
- `message: string` - Error message
- `onRetry?: () => void` - Optional retry handler
- `className?: string` - Optional additional CSS classes

**Usage:**
```tsx
<ErrorState
  message="Failed to load courses. Please try again."
  onRetry={handleRetry}
/>
```

### CourseCardSkeleton
A skeleton loader for course cards during loading states.

**Location:** `apps/lms/components/CourseCardSkeleton.tsx`

**Usage:**
```tsx
{loading ? (
  Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)
) : (
  courses.map(course => <CourseCard course={course} />)
)}
```

### TableSkeleton
A skeleton loader for table rows during loading states.

**Location:** `apps/lms/components/TableSkeleton.tsx`

**Props:**
- `rows?: number` - Number of skeleton rows (default: 5)
- `columns?: number` - Number of skeleton columns (default: 5)

**Usage:**
```tsx
{loading ? (
  <TableSkeleton rows={10} columns={6} />
) : (
  <Table>...</Table>
)}
```

## Feature Components

### CurrencyConverter
Displays prices in the user's preferred currency with exchange rate information.

**Location:** `apps/lms/components/CurrencyConverter.tsx`

**Props:**
- `amountUSD: number` - Price in USD
- `showRate?: boolean` - Whether to show exchange rate (default: true)
- `className?: string` - Optional additional CSS classes

**Usage:**
```tsx
<CurrencyConverter amountUSD={49.99} showRate={true} />
```

### PaymentForm
A payment form component supporting Stripe and Flutterwave gateways.

**Location:** `apps/lms/components/PaymentForm.tsx`

**Props:**
- `amountUSD: number` - Course price in USD
- `courseId: number` - Course ID
- `courseTitle: string` - Course title
- `onSuccess?: () => void` - Success callback
- `onCancel?: () => void` - Cancel callback

**Usage:**
```tsx
<PaymentForm
  amountUSD={49.99}
  courseId={1}
  courseTitle="Digital Marketing"
  onSuccess={() => router.push('/learner/courses')}
/>
```

### FileUpload
A drag-and-drop file upload component with progress tracking.

**Location:** `apps/lms/components/FileUpload.tsx`

**Props:**
- `accept?: string` - MIME type to accept
- `maxSize?: number` - Maximum file size in bytes (default: 10MB)
- `multiple?: boolean` - Allow multiple files (default: false)
- `onUploadComplete?: (files: File[]) => void` - Upload completion callback
- `type?: "image" | "video" | "document" | "all"` - File type filter (default: "all")
- `className?: string` - Optional additional CSS classes

**Usage:**
```tsx
<FileUpload
  type="image"
  maxSize={5 * 1024 * 1024}
  onUploadComplete={(files) => console.log('Uploaded:', files)}
/>
```

### CertificatePreview
A component for previewing and downloading course completion certificates.

**Location:** `apps/lms/components/CertificatePreview.tsx`

**Props:**
- `courseTitle: string` - Course title
- `learnerName: string` - Learner's name
- `completionDate: string` - Date of completion
- `certificateId?: string` - Optional certificate ID
- `onDownload?: () => void` - Download handler
- `className?: string` - Optional additional CSS classes

**Usage:**
```tsx
<CertificatePreview
  courseTitle="Digital Marketing"
  learnerName="John Doe"
  completionDate="January 25, 2024"
  certificateId="CERT-2024-001"
  onDownload={handleDownload}
/>
```

### CourseCard
A reusable card component for displaying course information with course image, metadata, description, and action buttons.

**Location:** `apps/lms/components/CourseCard.tsx`

**Props:**
- `course: Module` - Course object (from `@/data/courses`)
- `status?: "enrolled" | "completed" | "available"` - Course status (auto-detected if not provided)
- `progress?: number` - Progress percentage (0-100)
- `showProgress?: boolean` - Whether to show progress bar
- `userProgress?: Record<number, number>` - User progress map for all courses
- `enrolledCourseIds?: number[]` - Array of enrolled course IDs
- `completedCourseIds?: number[]` - Array of completed course IDs
- `courseImage?: string` - Optional custom course image URL
- `className?: string` - Optional additional CSS classes

**Features:**
- Automatically determines course status based on enrollment/completion
- Shows appropriate CTA buttons based on course status and enrollment mode
- Displays course metadata (lessons, duration, learners, price)
- Shows progress bar for enrolled courses
- Supports different enrollment modes (free, buy, recurring, request)

**Usage:**
```tsx
<CourseCard
  course={courseData}
  status="enrolled"
  progress={60}
  showProgress={true}
  enrolledCourseIds={[1, 2, 3]}
  completedCourseIds={[4]}
  userProgress={{ 1: 60, 2: 30 }}
/>
```

## Mock Data Files

All mock data is located in `apps/lms/data/`:

- `courses.ts` - Course and module data
- `users.ts` - User data
- `enrollments.ts` - Enrollment records
- `progress.ts` - Course and lesson progress tracking
- `payments.ts` - Payment transaction records
- `certificates.ts` - Certificate records
- `achievements.ts` - Achievement definitions and user achievements
- `analytics.ts` - Analytics and reporting data

## Notes

- All components use TypeScript for type safety
- Components follow the shadcn/ui design system
- Loading states use skeleton loaders for better UX
- Error states provide retry functionality where applicable
- All components are responsive and support dark/light themes

