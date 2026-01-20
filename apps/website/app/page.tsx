"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import CourseGrid from "@/components/CourseGrid"
import { useBrandSettings } from "@/lib/hooks/useBrandSettings"

// You can use environment variables for the app URL
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.example.com").replace(/\/$/, '') // Remove trailing slash

export default function LandingPage() {
  const brandSettings = useBrandSettings()
  const platformName = brandSettings.platformName || "EaseLMS"
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo className="w-44" />
          <div className="flex gap-2">
            <Link href={`${APP_URL}/auth/learner/login`}>
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link href={`${APP_URL}/auth/learner/signup`}>
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Learn. Grow. Succeed.
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform your life through knowledge with {platformName}. Access world-class courses designed to help you achieve your goals and unlock your potential.
          </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href={`${APP_URL}/auth/learner/signup`}>
                <Button size="lg" className="text-lg px-8 py-6">
                  Start Your Journey
                </Button>
              </Link>
              <Link href="#courses">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Explore Courses
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Courses Section */}
        <section id="courses" className="bg-muted/30">
          <CourseGrid
            title="Featured Courses"
            subtitle="Discover our most popular courses and start your learning journey today"
            limit={6}
            showSearch={false}
            showFilters={false}
          />
        </section>

        {/* Why Choose Us Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose {platformName}?</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We're committed to providing exceptional learning experiences that drive real results.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Expert-Led Courses</h3>
                <p className="text-muted-foreground">Learn from industry professionals and academic experts with years of experience.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Flexible Learning</h3>
                <p className="text-muted-foreground">Study at your own pace with lifetime access to course materials and updates.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Certified Learning</h3>
                <p className="text-muted-foreground">Earn recognized certificates upon course completion to showcase your achievements.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Learning?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of learners who are already transforming their lives through our courses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`${APP_URL}/auth/learner/signup`}>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">Create Free Account</Button>
              </Link>
              <Link href={`${APP_URL}/learner/courses`}>
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">Browse All Courses</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Logo className="w-32 mb-4" />
              <p className="text-muted-foreground mb-4 max-w-md">
                Empowering learners worldwide with quality education and transformative experiences.
              </p>
              <div className="flex space-x-4">
                {/* Social links can be added here */}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href={`${APP_URL}/learner/courses`} className="hover:text-primary transition-colors">Courses</Link></li>
                <li><Link href={`${APP_URL}/auth/learner/login`} className="hover:text-primary transition-colors">Login</Link></li>
                <li><Link href={`${APP_URL}/auth/learner/signup`} className="hover:text-primary transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} {platformName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
