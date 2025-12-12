# EaselMS - Turborepo Monorepo

This is a Turborepo monorepo containing two separate Next.js 16 applications that can be deployed independently.

## Structure

```
easelms/
├── apps/
│   ├── lms/              # LMS Application (Learning Management System)
│   │   ├── app/          # Next.js app directory
│   │   ├── components/   # LMS components + UI components
│   │   ├── data/         # Mock data files
│   │   ├── lib/          # Utility functions
│   │   ├── hooks/        # React hooks
│   │   ├── utils/        # App-specific utilities
│   │   ├── middleware.ts # LMS routing middleware
│   │   └── package.json  # LMS dependencies
│   │
│   └── website/          # Marketing/Landing Page
│       ├── app/          # Next.js app directory
│       ├── components/   # Website components
│       ├── lib/          # Utilities
│       ├── public/       # Public assets
│       └── package.json  # Website dependencies
│
├── package.json          # Root workspace configuration
├── turbo.json            # Turborepo configuration
└── public/               # Shared public assets (optional)
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 10.0.0

## Getting Started

### Install Dependencies

```bash
npm install
```

This will install dependencies for all apps in the monorepo using npm workspaces.

### Development

Run all apps in development mode:

```bash
npm run dev
```

Run a specific app:

```bash
# LMS
npm run dev --filter=lms

# Website
npm run dev --filter=website
```

Or navigate to the app directory:

```bash
cd apps/lms
npm run dev

# Or
cd apps/website
npm run dev
```

### Build

Build all apps:

```bash
npm run build
```

Build a specific app:

```bash
npm run build --filter=lms
npm run build --filter=website
```

### Lint

Lint all apps:

```bash
npm run lint
```

## Deployment on Vercel

### Recommended: Two Separate Projects

1. **LMS Project**:
   - Root Directory: `apps/lms`
   - Custom Domain: `app.example.com`
   - Build Command: `npm install && npm run build`
   - Output Directory: `.next`

2. **Website Project**:
   - Root Directory: `apps/website`
   - Custom Domain: `example.com`
   - Build Command: `npm install && npm run build`
   - Output Directory: `.next`

### Environment Variables

**Website** should have:
- `NEXT_PUBLIC_APP_URL=https://app.example.com` (for linking to LMS)

**LMS** may need:
- Database connection strings
- API keys
- Authentication secrets
- etc.

## Turborepo Features

- **Parallel Execution**: Builds and tasks run in parallel across apps
- **Remote Caching**: Share build cache across team and CI/CD (optional)
- **Incremental Builds**: Only rebuild what changed
- **Task Pipeline**: Define dependencies between tasks

### Enable Remote Caching (Optional)

```bash
# Install Vercel CLI
npm install -g vercel

# Link to Vercel
turbo link
```

## Technology Stack

- **Next.js**: 16.0.10 (with Turbopack enabled by default)
- **React**: 19
- **TypeScript**: 5
- **Turborepo**: 2.3.3
- **Tailwind CSS**: 3.4.17

## Key Differences

- **LMS (`apps/lms/`)**: Full-featured application with authentication, admin dashboard, course management, etc.
- **Website (`apps/website/`)**: Simple landing page with links to the LMS app

## Notes

- Each app is a complete, independent Next.js application
- They share no code (except potentially public assets)
- Each can be deployed, updated, and scaled independently
- The middleware in `apps/lms/` only handles LMS routing
- The website has no middleware (simple static/marketing site)
- Next.js 16 uses Turbopack by default for faster builds
