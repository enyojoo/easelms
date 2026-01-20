# EaseLMS Website

A modern, marketing-focused website that showcases courses and drives enrollment to the EaseLMS platform. Fully configurable through the LMS admin panel.

## Features

- **Course Showcase**: Display courses from the LMS in beautiful cards
- **Marketing Pages**: Course detail pages with enrollment CTAs
- **Responsive Design**: Works perfectly on desktop and mobile
- **SEO Optimized**: Proper meta tags and structured content
- **Fast Loading**: Optimized images and efficient data fetching
- **Dynamic Branding**: Automatically syncs platform name, logo, and branding from LMS admin settings

## Setup

1. **Install dependencies:**
   ```bash
   cd apps/website
   npm install
   ```

2. **Environment Variables:**
   Copy the example environment file and configure:
   ```bash
   cp .env.example .env.local
   ```

   Configure the following variables:
   - `NEXT_PUBLIC_LMS_URL`: URL where your LMS is running (default: http://localhost:3001)
   - `NEXT_PUBLIC_APP_URL`: Public URL of your LMS for user access

3. **Run the development server:**
   ```bash
   npm run dev
   ```

## Architecture

### Components

- **CourseCard**: Displays course information in a card format
- **CourseGrid**: Shows multiple courses in a responsive grid
- **EnrollmentCTA**: Handles enrollment flow and redirects to LMS
- **SafeImage**: Optimized image component with error handling

### API Routes

- `/api/courses`: Fetches courses from the LMS
- `/api/courses/[id]`: Fetches individual course details

### Pages

- `/`: Homepage with hero section and course showcase
- `/courses/[id]`: Course detail page
- `/terms`: Terms of service
- `/privacy`: Privacy policy

## Integration with LMS

The website acts as a marketing front-end for the LMS:

1. **Course Data**: Fetches course information from LMS API
2. **Enrollment Flow**: Redirects users to LMS for sign-up/enrollment
3. **Branding**: Uses the same logo and branding as LMS
4. **Seamless Experience**: Users can browse on website, enroll on LMS

## Customization

### Styling
- Uses Tailwind CSS for styling
- Consistent with LMS design system
- Dark/light theme support

### Content
- Update course descriptions in LMS
- Modify marketing copy in website components
- Add new sections to homepage

### Branding
- **Platform Name**: Automatically syncs with LMS admin settings
- **Logo**: Dynamically loads from LMS branding configuration
- **Footer & Legal**: Terms, privacy, and copyright use dynamic platform name
- Update colors and fonts in Tailwind config

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

## Branding Configuration

The website automatically pulls branding information from your LMS. To customize:

1. **Login to LMS Admin**: Access your LMS admin panel
2. **Navigate to Settings**: Go to Platform Settings > Branding
3. **Configure**:
   - Platform Name (appears in header, footer, legal pages)
   - Logo files (light/dark variants)
   - Favicon
   - SEO settings
4. **Save Changes**: Website will automatically sync within minutes

### Environment Variables

Create a `.env.local` file with:

```bash
# LMS URL - The URL where your LMS application is running (used for API calls)
NEXT_PUBLIC_LMS_URL=http://localhost:3001

# App URL - The URL where your LMS application is accessible to users (for redirects)
NEXT_PUBLIC_APP_URL=https://your-lms-domain.com
```

## Support

For questions about the website implementation, please refer to the LMS documentation or contact the development team.