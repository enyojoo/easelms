"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import CourseGrid from "@/components/CourseGrid"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { useBrandSettings } from "@/lib/hooks/useBrandSettings"

// You can use environment variables for the app URL
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.example.com").replace(/\/$/, '') // Remove trailing slash

export default function LandingPage() {
  const brandSettings = useBrandSettings()
  const platformName = brandSettings.platformName || "EaseLMS"
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 dark:from-background dark:via-background dark:to-muted/10">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-primary/5 dark:to-primary/3" />

          <div className="relative py-20 md:py-32 lg:py-40">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/80 dark:from-foreground dark:to-foreground/90 bg-clip-text text-transparent">
                Learn. Grow. Succeed.
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                Transform your life through knowledge with {platformName}. Access world-class courses designed to help you achieve your goals and unlock your potential.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Link href={`${APP_URL}/auth/learner/signup`}>
                  <Button
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 px-8 py-6 text-lg"
                  >
                    Start Your Journey
                  </Button>
                </Link>
                <Link href="#courses">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-foreground text-foreground hover:bg-foreground hover:text-background dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 px-8 py-6 text-lg"
                  >
                    Explore Courses
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Courses Section */}
        <section id="courses" className="py-20 bg-muted/30 dark:bg-muted/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Featured Courses
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover our most popular courses and start your learning journey today
              </p>
            </div>
            <CourseGrid
              limit={6}
              showSearch={false}
              showFilters={false}
            />
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-20 bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Why Choose {platformName}?
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                We're committed to providing exceptional learning experiences that drive real results.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="group text-center p-6 rounded-xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Expert-Led Courses</h3>
                <p className="text-muted-foreground leading-relaxed">Learn from industry professionals and academic experts with years of experience.</p>
              </div>
              <div className="group text-center p-6 rounded-xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Flexible Learning</h3>
                <p className="text-muted-foreground">Study at your own pace with lifetime access to course materials and updates.</p>
              </div>
              <div className="group text-center p-6 rounded-xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Certified Learning</h3>
                <p className="text-muted-foreground leading-relaxed">Earn recognized certificates upon course completion to showcase your achievements.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-20 md:py-24 overflow-hidden bg-white dark:bg-black">
          <div className="relative container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground dark:text-white">
              Ready to Start Learning?
            </h2>
            <p className="text-lg md:text-xl mb-10 text-muted-foreground dark:text-white/90 max-w-2xl mx-auto leading-relaxed">
              Join thousands of learners who are already transforming their lives through our courses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href={`${APP_URL}/auth/learner/signup`}>
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 px-8 py-6 text-lg"
                >
                  Create Free Account
                </Button>
              </Link>
              <Link href={`${APP_URL}/learner/courses`}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-foreground text-foreground hover:bg-foreground hover:text-background dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 px-8 py-6 text-lg"
                >
                  Browse All Courses
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
