<div align="center">

<img src="https://cldup.com/3DOgOVrIWN.png" alt="EaseLMS Logo" width="250" />

**The Modern Open-Source Learning Management System**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-green?logo=supabase)](https://supabase.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Hosted Service](#-hosted-service) • [Contributing](#-contributing)

</div>

---

## 🎯 Overview

EaseLMS is a modern, open-source Learning Management System built with Next.js, TypeScript, and Supabase. It provides a complete solution for creating, managing, and delivering online courses with features like video lessons, interactive quizzes, progress tracking, certificates, and payment integration.

### Why EaseLMS?

- 🚀 **Modern Stack** - Built with Next.js 16, React 19, and TypeScript
- 🎨 **Beautiful UI** - Modern, responsive design with dark mode support
- 🔒 **Secure** - Built-in authentication, role-based access control, and data encryption
- 💰 **Monetization Ready** - Integrated payment processing (Stripe, Flutterwave)
- 📱 **Mobile First** - Fully responsive design that works on all devices
- 🎓 **Feature Rich** - Courses, quizzes, certificates, analytics, and more
- 🔧 **Self-Hostable** - Complete control over your data and infrastructure
- 🌍 **Open Source** - Free to use, modify, and distribute

---

## ✨ Features

### Course Management
- 📚 Create unlimited courses with rich content editor
- 🎥 Video lessons with progress tracking
- 📄 Document resources (PDF, DOC, images)
- 🔗 Course prerequisites and dependencies
- 🏷️ Course categories and tags
- 📊 Course analytics and enrollment tracking
- 💰 Multiple enrollment modes (free, paid, recurring, closed)
- 🎬 Preview videos for course marketing

### Learning Experience
- 📱 Mobile-responsive course player
- ⏯️ Video playback with progress saving
- ✅ Interactive quizzes with multiple question types
- 📈 Real-time progress tracking
- 🏆 Achievement badges and certificates
- 💬 Discussion and support features
- 📋 Lesson resources and downloadable materials

### Admin & Instructor Tools
- 👥 User management (Admin, Instructor, Learner roles)
- 📊 Comprehensive analytics dashboard
- 💳 Purchase and payment management
- 🎨 Custom branding and theming
- ⚙️ Flexible course settings and enrollment modes
- 📧 Email notifications
- 🔐 Role-based access control

### Payment Integration
- 💳 Stripe integration for global payments
- 🌍 Flutterwave for African markets
- 💱 Multi-currency support
- 💰 One-time and recurring payment options
- 📦 Purchase history and receipts
- 🔄 Payment webhook handling

### Certificates
- 🎓 Automated certificate generation
- ✍️ Custom certificate templates
- 🔏 Digital signatures
- 📄 PDF export
- 🏅 Completion and achievement certificates

### Developer Experience
- 🔧 TypeScript for type safety
- 📦 Monorepo structure with Turborepo
- 🎨 shadcn/ui component library
- 🧪 Well-structured, maintainable codebase
- 📝 Comprehensive documentation

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Components:** [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication:** Supabase Auth
- **File Storage:** AWS S3 + CloudFront
- **State Management:** [TanStack Query](https://tanstack.com/query)
- **Forms:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Payments:** [Stripe](https://stripe.com/) & [Flutterwave](https://flutterwave.com/)
- **PDF Generation:** [PDFKit](https://pdfkit.org/)
- **Video Player:** [Video.js](https://videojs.com/)
- **Monorepo:** [Turborepo](https://turbo.build/)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0 or higher
- npm 10.0 or higher
- A Supabase account (free tier works)
- AWS account (for S3 storage, optional for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/enyojoo/easelms.git
   cd easelms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in `apps/lms/`:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # AWS S3 (optional for development)
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_S3_BUCKET_NAME=your_bucket_name
   AWS_CLOUDFRONT_DOMAIN=your_cloudfront_domain

   # Payment Gateways (optional)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
   NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key

   # App URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up Supabase Database**
   
   Run the database migrations from `apps/lms/supabase/migrations/` in your Supabase project.

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### First Admin User

After setting up the database, create your first admin user through the Supabase dashboard or by using the signup API endpoint.

---

## 📖 Documentation

- [Installation Guide](https://easelms.org/docs/installation)
- [Configuration](https://easelms.org/docs/configuration)
- [Deployment](https://easelms.org/docs/deployment)
- [API Reference](https://easelms.org/docs/api)
- [Contributing Guide](CONTRIBUTING.md)

For detailed documentation, visit [easelms.org/docs](https://easelms.org/docs)

---

## 🏗️ Project Structure

```
easelms/
├── apps/
│   ├── lms/              # Main LMS application
│   │   ├── app/          # Next.js app router pages
│   │   │   ├── admin/    # Admin dashboard pages
│   │   │   ├── learner/  # Learner-facing pages
│   │   │   ├── api/      # API routes
│   │   │   └── auth/     # Authentication pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities and helpers
│   │   │   ├── aws/      # AWS S3 integration
│   │   │   ├── certificates/ # Certificate generation
│   │   │   ├── payments/ # Payment processing
│   │   │   └── supabase/ # Supabase utilities
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Utility functions
│   │   └── supabase/     # Database migrations
│   └── website/          # Marketing website
├── components/           # Shared components
├── package.json          # Root package.json
└── turbo.json           # Turborepo configuration
```

---

## 🎨 Screenshots

<div align="center">

### Dashboard
![Dashboard](https://via.placeholder.com/800x450/1e293b/ffffff?text=Dashboard+Preview)

### Course Creation
![Course Creation](https://via.placeholder.com/800x450/1e293b/ffffff?text=Course+Creation+Interface)

### Learning Interface
![Learning Interface](https://via.placeholder.com/800x450/1e293b/ffffff?text=Course+Player)

</div>

*Add your actual screenshots here*

---

## 🌐 Hosted Service

Don't want to manage infrastructure? We offer a fully managed hosted service with:

- ✅ **Zero Setup** - Get started in minutes
- ✅ **Managed Infrastructure** - We handle Supabase, S3, and hosting
- ✅ **Automatic Updates** - Always on the latest version
- ✅ **Professional Support** - Priority email and chat support
- ✅ **Custom Branding** - Your logo, colors, and domain
- ✅ **Backups & Security** - Automated backups and security updates

### Pricing

| Plan | Price | Learners | Storage | Bandwidth |
|------|-------|----------|---------|-----------|
| **Starter** | $99/mo | Up to 100 | 50GB | 100GB/mo |
| **Professional** | $299/mo | Up to 500 | 200GB | 500GB/mo |
| **Enterprise** | Custom | Unlimited | Custom | Custom |

[View Full Pricing →](https://easelms.org/pricing) | [Start Free Trial →](https://easelms.org/trial)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build
```

---

## 📝 License

This project is licensed under the **AGPL-3.0 License** - see the [LICENSE](LICENSE) file for details.

### Commercial License

If you need to use EaseLMS in a proprietary application without open-sourcing your code, commercial licenses are available. [Contact us](https://easelms.org/contact) for more information.

---

## 🆘 Support

- 📚 [Documentation](https://easelms.org/docs)
- 💬 [GitHub Discussions](https://github.com/enyojoo/easelms/discussions)
- 🐛 [Issue Tracker](https://github.com/enyojoo/easelms/issues)
- 📧 [Email Support](mailto:support@easelms.org)
- 💼 [Enterprise Support](https://easelms.org/enterprise)

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics and reporting
- [ ] SCORM compliance
- [ ] Live video conferencing integration
- [ ] AI-powered course recommendations
- [ ] Multi-language support
- [ ] Advanced quiz types (drag-and-drop, matching, etc.)
- [ ] Learning paths and curriculum builder

[View Full Roadmap →](https://github.com/enyojoo/easelms/projects)

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database powered by [Supabase](https://supabase.com/)
- Icons from [Lucide](https://lucide.dev/)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=enyojoo/easelms&type=Date)](https://star-history.com/#enyojoo/easelms&Date)

---

<div align="center">

**Made with ❤️ by the EaseLMS team**

[Website](https://easelms.org) • [Documentation](https://easelms.org/docs) • [Twitter](https://twitter.com/easelms) • [Discord](https://discord.gg/easelms)

</div>
