# EaseLMS Deployment Guide

This guide covers deploying the EaseLMS monorepo with separate Vercel projects for the LMS and website.

## 🏗️ Architecture Overview

```
┌─────────────────┐    API Calls    ┌─────────────────┐
│   Website       │◄──────────────►│      LMS        │
│   (Marketing)   │                │   (Learning)    │
│   website.com   │  Branding Sync  │   app.website.com│
└─────────────────┘                └─────────────────┘
        │                                 │
        └───────── User Enrollment ───────┘
```

## 📦 Monorepo Structure

```
easelms/
├── apps/
│   ├── lms/           # Learning Management System
│   └── website/       # Marketing Website
├── package.json       # Root package.json
└── turbo.json         # Turbo build configuration
```

## 🚀 Deployment Steps

### Step 1: Deploy LMS First

1. **Navigate to LMS directory:**
   ```bash
   cd apps/lms
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Get the deployment URL:**
   - Note the Vercel URL (e.g., `https://easelms-lms.vercel.app`)
   - This will be your `NEXT_PUBLIC_APP_URL`

### Step 2: Deploy Website Second

1. **Navigate to website directory:**
   ```bash
   cd apps/website
   ```

2. **Set environment variables in Vercel:**
   ```bash
   vercel --prod
   ```

3. **Configure environment variables in Vercel dashboard:**
   - `NEXT_PUBLIC_LMS_URL=https://your-lms-project.vercel.app`
   - `NEXT_PUBLIC_APP_URL=https://your-lms-project.vercel.app`

## 🔧 Environment Variables

### LMS Environment Variables (Vercel)

```bash
# Required Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Website URL for CORS (leave blank for '*' to allow all origins)
NEXT_PUBLIC_WEBSITE_URL=https://your-website-project.vercel.app
```

### Website Environment Variables (Vercel)

```bash
# LMS API URL - Where website fetches data from
NEXT_PUBLIC_LMS_URL=https://your-lms-project.vercel.app

# LMS App URL - Where users get redirected for enrollment
NEXT_PUBLIC_APP_URL=https://your-lms-project.vercel.app
```

## 🌐 Domain Configuration

### Option 1: Subdomain Setup (Recommended)

```
website.com (Vercel) → Marketing Website
app.website.com (Vercel) → LMS Application
```

### Option 2: Same Domain Different Paths

```
website.com (Vercel) → Marketing Website
website.com/app/* (Vercel) → LMS Application (rewrite rules)
```

## 🔒 CORS Configuration

CORS is automatically configured in the LMS middleware to allow the website to access API endpoints:

- ✅ `/api/brand-settings` - Branding data
- ✅ `/api/courses` - Course listings
- ✅ `/api/courses/[id]` - Course details

### CORS Behavior

The LMS uses the `NEXT_PUBLIC_WEBSITE_URL` environment variable to control CORS:
- **If set**: Only allows requests from the specified website domain
- **If blank/unset**: Allows requests from any origin (`*`) - good for development

For production deployments, set `NEXT_PUBLIC_WEBSITE_URL` to your website domain for better security.

## 🔄 Data Synchronization

### Automatic Sync
- **Branding**: Website pulls platform name, logos, and settings from LMS
- **Courses**: Website displays courses from LMS database
- **Enrollment**: Users redirected to LMS for sign-up and learning

### Manual Updates
- Update branding in LMS admin → Website reflects changes immediately
- Add courses in LMS → Website shows new courses automatically

## 🧪 Testing Deployment

### 1. Test Branding Sync
```bash
# Visit website and check if platform name/logos match LMS
curl https://your-website.com
```

### 2. Test Course Data
```bash
# Check if courses load from LMS
curl https://your-website.com/api/courses
```

### 3. Test Enrollment Flow
```bash
# Click enroll on website → Should redirect to LMS sign-up
```

## 🚨 Troubleshooting

### Common Issues

**1. CORS Errors:**
- Check LMS middleware CORS configuration
- Verify `NEXT_PUBLIC_WEBSITE_URL` in LMS environment variables
- If CORS errors persist, try setting `NEXT_PUBLIC_WEBSITE_URL` to blank (allows all origins)

**2. Branding Not Syncing:**
- Check `NEXT_PUBLIC_LMS_URL` in website Vercel settings
- Verify LMS `/api/brand-settings` endpoint is accessible

**3. Courses Not Loading:**
- Check LMS `/api/courses` endpoint
- Verify database has published courses

**4. Enrollment Redirects Failing:**
- Check `NEXT_PUBLIC_APP_URL` in website Vercel settings
- Verify LMS auth routes are working

## 📊 Performance Considerations

### Vercel Optimizations
- ✅ Static generation for marketing pages
- ✅ Image optimization
- ✅ API route caching
- ✅ Edge functions for global CDN

### Database Performance
- LMS APIs are optimized for public access
- Course data is cached on website
- Branding data updates automatically

## 🔐 Security

### API Access
- Public endpoints only expose non-sensitive data
- User authentication handled on LMS domain
- No sensitive data shared between applications

### Cross-Origin Security
- CORS configured for allowed origins
- API routes protected by Vercel security
- No credential sharing between domains

## 🎯 Success Checklist

- [ ] LMS deployed to Vercel
- [ ] Website deployed to Vercel
- [ ] Environment variables configured (including CORS settings)
- [ ] Branding syncs correctly
- [ ] Courses display on website
- [ ] Enrollment redirects work
- [ ] CORS allows API access (test with browser dev tools)
- [ ] Domains configured properly

## 📞 Support

For deployment issues, check:
1. Vercel deployment logs
2. Browser network tab for API errors
3. LMS admin panel for branding settings
4. Database connectivity

The monorepo setup ensures seamless integration between marketing and learning platforms! 🚀