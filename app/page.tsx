import Link from "next/link"
import { Button } from "@/components/ui/button"
import Logo from "./components/Logo"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo className="w-32" />
          <div className="flex gap-4">
            <Link href="/app/auth/user/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/app/auth/user/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex items-center justify-center">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Learn. Grow. Succeed.
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A modern learning management system designed to help you achieve your goals.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/app/auth/user/signup">
              <Button size="lg">Start Learning</Button>
            </Link>
            <Link href="/app/auth/admin/login">
              <Button size="lg" variant="outline">
                Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 EaseLMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
