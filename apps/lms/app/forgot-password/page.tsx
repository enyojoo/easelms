"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import Logo from "@/components/Logo"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you would send a request to your backend to initiate the password reset process
    console.log("Password reset requested for:", email)
    // For demo purposes, we'll just redirect to the code entry page
    router.push("/forgot-password/code")
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-background px-4 sm:px-0">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo className="mx-auto mb-8" />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>Enter your email to receive a password reset code</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full">
                Send Reset Code
              </Button>
              <div className="text-center text-sm">
                <Link href="/login" className="text-center text-sm underline">
                  Back to Login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
