"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.example.com").replace(/\/$/, '') // Remove trailing slash

export default function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/">
          <Logo className="w-32 md:w-44" />
        </Link>
        <div className="flex gap-2">
          <a href={`${APP_URL}/auth/learner/login`} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm">Login</Button>
          </a>
          <a href={`${APP_URL}/auth/learner/signup`} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-block">
            <Button size="sm">Get Started</Button>
          </a>
        </div>
      </div>
    </header>
  )
}
