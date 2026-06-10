"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Logo from "@/components/Logo"
import Indicator from "@/components/Indicator"
import { AlertCircle } from "lucide-react"
import { getPasswordResetEmail } from "@/lib/auth/password-reset"

export default function ResetCodePage() {
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  useEffect(() => {
    const storedEmail = getPasswordResetEmail()
    if (!storedEmail) {
      router.replace("/forgot-password")
      return
    }
    setEmail(storedEmail)
    inputRefs.current[0]?.focus()
  }, [router])

  const handleInputChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)

    if (digit !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && index > 0 && code[index] === "") {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return

    const newCode = [...code]
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || ""
    }
    setCode(newCode)

    const nextIndex = Math.min(pasted.length, 5)
    inputRefs.current[nextIndex]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) return

    const fullCode = code.join("")
    if (fullCode.length !== 6) {
      setError("Please enter the full 6-digit code.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, token: fullCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Invalid or expired code. Please try again.")
        return
      }

      router.push("/forgot-password/new-password")
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return

    setError("")
    setResending(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to resend code. Please try again.")
        return
      }

      setCode(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setResending(false)
    }
  }

  if (!email) {
    return null
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-background px-4 sm:px-0">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo className="mx-auto mb-8 max-w-[100px] sm:max-w-[120px]" />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enter Reset Code</CardTitle>
            <CardDescription>
              Enter the 6-digit code sent to {email}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-between gap-2">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    ref={(el) => {
                      inputRefs.current[index] = el
                    }}
                    className="w-12 h-12 text-center text-lg"
                    disabled={loading}
                  />
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
              <div className="text-center text-sm">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || loading}
                  className="text-primary underline disabled:opacity-50"
                >
                  {resending ? "Resending..." : "Resend"}
                </button>
                {" | "}
                <Link href="/auth/learner/login" className="text-primary underline">
                  Back to Login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
        <Indicator />
      </div>
    </div>
  )
}
