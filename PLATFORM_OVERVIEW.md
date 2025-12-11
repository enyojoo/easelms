# Enthronement University - Platform Overview

## Platform Structure

### Architecture
- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript
- **UI Library**: Shadcn UI components with Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: React hooks (useState, useEffect)
- **Authentication**: Cookie-based with client/server utilities
- **Routing**: File-system based routing with middleware for subdomain handling

### Domain Structure
- **Main Domain** (`example.com`): Landing page and marketing content
- **App Subdomain** (`app.example.com`): Application platform (user and admin interfaces)
- **Middleware**: Handles subdomain routing and redirects

---

## Authentication System

### User Types
1. **User (Learner)**: Students who enroll in and take courses
2. **Admin (Instructor)**: Course creators and platform administrators

### Authentication Routes
- **User Login**: `/auth/user/login`
- **User Signup**: `/auth/user/signup`
- **Admin Login**: `/auth/admin/login`
- **Password Recovery**: `/forgot-password`, `/forgot-password/code`, `/forgot-password/new-password`

### Authentication Features
- Email/password authentication
- Demo access for quick testing
- Cookie-based session management
- Type-based redirects (user → `/user/dashboard`, admin → `/admin/dashboard`)
- Logout utility function with automatic redirect

---

## User (Learner) Platform

### Navigation Structure
- **Left Sidebar** (Desktop): Dashboard, Courses, Achievements, Support, Profile, Settings, Logout
- **Mobile Menu**: Hamburger menu with same navigation options

### Pages & Features

#### 1. Dashboard (`/user/dashboard`)
**Overview Tab:**
- Welcome message with user name
- Statistics cards:
  - Courses in Progress
  - Learning Hours
  - Learning Streak
- Continue Learning section with progress bars
- Recent Achievements display
- Recommended Courses grid

**Analytics Tab:**
- Learning analytics with charts and metrics
- Progress tracking over time
- Course completion statistics

#### 2. Courses (`/user/courses`)
**Features:**
- Search functionality
- Three tabs:
  - **Enrolled**: Courses currently in progress with progress indicators
  - **Completed**: Finished courses with summary access
  - **Available**: Browse and enroll in new courses
- Course cards with:
  - Thumbnail images
  - Course title and description
  - Price information
  - Enrollment status
  - Progress indicators (for enrolled courses)
  - Action buttons (View, Continue, Enroll, etc.)

#### 3. Course Detail (`/user/courses/[id]`)
**Features:**
- Course overview page
- Course description and requirements
- Course content preview (lessons, quizzes, resources)
- Instructor profile with social links
- Pricing and enrollment options:
  - Free courses
  - One-time purchase
  - Subscription-based
  - Request access
- Course statistics (enrolled students, duration, etc.)

#### 4. Course Learning (`/user/courses/[id]/learn`)
**Learning Components:**
- **VideoPlayer**: Standard video playback
- **QuizComponent**: Interactive quizzes with multiple-choice questions
- **LessonContent**: Text-based lesson content
- **ResourcesPanel**: Downloadable documents and external links

**Features:**
- Sequential lesson navigation
- Progress tracking
- Quiz completion tracking
- Resource downloads
- Course completion certificates

#### 5. Course Summary (`/user/courses/[id]/learn/summary`)
- Course completion summary
- Final quiz results
- Certificate download
- Course statistics

#### 6. Achievements (`/user/achievements`)
**Features:**
- List of downloadable certificates
- Certificate details (course name, completion date)
- Download functionality for certificates
- Empty state for users without certificates

#### 7. Profile (`/user/profile`)
- User profile information
- Profile image
- Personal details management

#### 8. Settings (`/user/settings`)
**Features:**
- **Language**: Multi-language support (English, Russian, Spanish, French)
- **Notifications**: Email notification preferences
- **Security**:
  - Two-factor authentication toggle
  - Password change
- **Integrations**: Google Calendar connection
- **Payment Method**: Add credit card, manage payment methods
- **Display Currency**: Select currency (USD, EUR, GBP, NGN)
- **Account Deletion**: Delete account option

---

## Admin (Instructor) Platform

### Navigation Structure
- **Left Sidebar** (Desktop): Dashboard, Courses, Report, Support, Profile, Settings, Logout
- **Mobile Menu**: Hamburger menu with same navigation options

### Pages & Features

#### 1. Dashboard (`/admin/dashboard`)
**Features:**
- Welcome message with admin name
- Key metrics cards:
  - **Total Revenue**: Revenue tracking with growth percentage
  - **Total Learners**: Student count with growth trends
  - **Total Courses**: Course count
- Quick Actions:
  - Create New Course button
- Countries section: Learner distribution by country
- Recent Feedback: Student feedback display
- Course Completion Rate: Overall completion statistics

#### 2. Courses (`/admin/courses`)
**Features:**
- List of all courses
- Course management:
  - View course details
  - Edit courses
  - Preview courses
  - Delete courses
- Course status indicators
- Search and filter functionality

#### 3. Create/Edit Course (`/admin/courses/new`)
**Course Builder Components:**

**A. CourseBasicInfo**
- Course title
- Description
- Requirements
- Who this course is for
- Thumbnail image upload
- Preview video

**B. LessonBuilder**
- Add/remove lessons
- Lesson ordering (drag and drop)
- Lesson types (video, text, quiz, etc.)

**C. LessonContentEditor**
- Rich text editor for lesson content
- Video embedding
- Resource attachments

**D. QuizBuilder**
- Create quizzes for lessons
- Multiple-choice questions
- Correct answer selection

**E. CourseSettings**
- **Basic Settings**:
  - Published status
  - Sequential progression
  - Minimum quiz score
- **Enrollment Settings**:
  - Enrollment mode (free, paid, subscription, request access)
  - Pricing configuration

**F. CourseCertificateSettings**
- Enable/disable certificates
- Certificate description
- Signature image upload
- Additional text customization

**G. CourseEnrollmentSettings**
- Enrollment modes
- Pricing tiers
- Subscription settings

**H. CoursePreview**
- Live preview of course
- Preview as student view

#### 4. Course Preview (`/admin/courses/preview/[id]`)
- Preview course as it appears to students
- Test course functionality

#### 5. Reports (`/admin/reports`)
**Analytics Features:**
- **Revenue Analytics**:
  - Revenue over time (line charts)
  - Revenue by course
  - Payout summary
- **Learner Analytics**:
  - Learner growth over time
  - Learner demographics by country
  - Enrollment trends
- **Course Performance**:
  - Course completion rates
  - Course popularity metrics
- **Export Options**: Data export functionality

#### 6. Profile (`/admin/profile`)
- Admin profile information
- Profile image
- Personal details management

#### 7. Settings (`/admin/settings`)
**Four Main Tabs:**

**A. Notifications**
- Platform notification settings:
  - Course enrollment notifications
  - Course completion notifications
  - Platform announcements
  - User email notifications (default preference)

**B. Users**
- User Management component:
  - Search users by name or email
  - View user details:
    - Name and email
    - Enrolled courses count
    - Completed courses count
    - Join date
    - Account status (active/suspended)
  - User actions:
    - Suspend/Activate users
    - Delete users
  - User status badges

**C. Team**
- Team Management component:
  - Add team members
  - Manage instructor permissions
  - Assign roles and access levels
  - Team member management

**D. Payment**
- Payment Settings component:
  - Payment gateway selection
  - Gateway API key configuration
  - Supported gateways:
    - Stripe
    - PayPal
    - Razorpay
    - Flutterwave
    - Paystack
    - Other custom gateways
  - Currency selection
  - Payment method management

---

## Course Features

### Course Structure
- **Modules/Courses**: Top-level course containers
- **Lessons**: Individual learning units within a course
- **Quizzes**: Assessment questions within lessons
- **Resources**: Downloadable documents and external links

### Course Types
1. **Free Courses**: No payment required
2. **Paid Courses**: One-time purchase
3. **Subscription Courses**: Recurring payment
4. **Request Access**: Manual approval required

### Course Content Types
- Video lessons
- Text-based content
- Interactive quizzes
- Code playgrounds
- Virtual labs
- Interactive simulations
- Downloadable resources
- External links

### Course Settings
- Sequential progression (lock lessons until previous completed)
- Minimum quiz score requirements
- Certificate generation
- Enrollment limits
- Access expiration
- Prerequisites
- Content visibility rules

---

## Technical Components

### Shared Components
- **ClientLayout**: Main layout wrapper with authentication handling
- **Header**: Top navigation bar with user profile
- **LeftSidebar**: Desktop navigation sidebar
- **MobileMenu**: Mobile navigation menu
- **Logo**: Platform logo component
- **ThemeProvider**: Dark/light theme management
- **ThemeToggle**: Theme switcher
- **PageTransition**: Page transition animations
- **VideoModal**: Video playback modal
- **NewUpdateModal**: Platform/course update notifications

### UI Components (Shadcn UI)
- Cards, Buttons, Inputs, Selects
- Tabs, Tables, Dialogs, Sheets
- Progress bars, Badges, Avatars
- Accordions, Dropdowns, Switches
- Charts (Recharts integration)

### Utilities
- **client-auth.ts**: Client-side authentication utilities
- **server-auth.ts**: Server-side authentication utilities
- **logout.ts**: Logout utility function

### Data Models
- **users.ts**: User data structure and mock data
- **courses.ts**: Course/module/lesson data structure

---

## Platform Features Summary

### User Features
✅ Course browsing and enrollment
✅ Interactive course learning
✅ Progress tracking
✅ Quiz completion
✅ Certificate downloads
✅ Learning analytics
✅ Achievement tracking
✅ Profile management
✅ Settings customization
✅ Multi-language support
✅ Payment method management
✅ Security settings (2FA)

### Admin Features
✅ Course creation and editing
✅ AI-powered course generation
✅ Lesson builder with drag-and-drop
✅ Quiz builder
✅ Certificate customization
✅ Course preview
✅ Revenue analytics
✅ Learner analytics
✅ User management
✅ Team management
✅ Payment gateway integration
✅ Notification settings
✅ Course access control
✅ Enrollment management

### Platform-Wide Features
✅ Responsive design (mobile, tablet, desktop)
✅ Dark/light theme support
✅ Multi-language support
✅ Subdomain routing
✅ Cookie-based authentication
✅ Role-based access control
✅ Progress tracking
✅ Analytics and reporting
✅ Payment processing integration
✅ Certificate generation
✅ Email notifications

---

## File Structure

```
app/
├── admin/                    # Admin platform
│   ├── courses/             # Course management
│   │   ├── new/            # Course creation/editing
│   │   └── preview/        # Course preview
│   ├── dashboard/          # Admin dashboard
│   ├── profile/             # Admin profile
│   ├── reports/            # Analytics and reports
│   └── settings/           # Platform settings
├── auth/                    # Authentication
│   ├── admin/              # Admin login
│   └── user/               # User login/signup
├── components/              # Shared components
├── data/                    # Mock data
├── user/                    # User platform
│   ├── achievements/       # Certificates
│   ├── courses/            # Course browsing/learning
│   ├── dashboard/          # User dashboard
│   ├── profile/            # User profile
│   └── settings/           # User settings
├── forgot-password/         # Password recovery
├── layout.tsx              # Root layout
└── page.tsx                # Landing page

middleware.ts               # Subdomain routing
```

---

## Current Status

### Completed Features
- ✅ User and Admin authentication
- ✅ Course creation and management
- ✅ Interactive learning interface
- ✅ Progress tracking
- ✅ Certificate system
- ✅ Analytics and reporting
- ✅ User management
- ✅ Settings management
- ✅ Payment gateway integration setup
- ✅ Multi-language support
- ✅ Responsive design
- ✅ Theme support

### Platform Name
- **Current**: Enthronement University
- **Previous**: EaseLMS

### Removed Features
- ❌ Workshops (removed)
- ❌ Sessions (removed)
- ❌ Messages (removed from user, removed from admin)
- ❌ Spark AI feature (removed from admin)

---

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Shadcn UI, Radix UI, Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Forms**: React Hook Form, Zod
- **State**: React Hooks
- **Routing**: Next.js App Router
- **Authentication**: Cookie-based
- **Font**: Poppins (Google Fonts)

---

## Development Notes

- All authentication is currently client-side with cookie management
- Data is mock data (users.ts, courses.ts)
- Payment gateways are configured but not fully integrated
- AI features (course generation, quiz generation) are UI-ready but may need backend integration
- Subdomain routing is configured via middleware
- Theme storage key: `enthronement-university-theme`

---

*Last Updated: Based on current codebase review*

