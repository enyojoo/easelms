"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import Logo from "../../components/Logo"

export default function ResetCodePage() {
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleInputChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...code]
      newCode[index] = value
      setCode(newCode)

      if (value !== "" && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && index > 0 && code[index] === "") {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = code.join("")
    console.log("Reset code submitted:", fullCode)
    router.push("/forgot-password/new-password")
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-background px-4 sm:px-0">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo className="mx-auto mb-8" />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enter Reset Code</CardTitle>
            <CardDescription>Enter the 6-digit code sent to your email</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    ref={(el) => (inputRefs.current[index] = el)}
                    className="w-12 h-12 text-center text-lg"
                  />
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full">
                Verify Code
              </Button>
              <div className="text-center text-sm">
                Didn't receive the code?{" "}
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Resend
                </Link>
                {" | "}
                <Link href="/login" className="text-primary hover:underline">
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
