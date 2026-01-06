"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Home, RefreshCw, AlertCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    // In development, show full error details
    if (process.env.NODE_ENV === 'development') {
      console.error("Application error:", {
        error,
        message: error.message,
        stack: error.stack,
        digest: error.digest,
      })
    }
    // TODO: In production, send to error tracking service (e.g., Sentry)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong!</AlertTitle>
            <AlertDescription className="mt-2">
              <div className="space-y-2">
                <p>{error.message || "An unexpected error occurred. Please try again."}</p>
                {process.env.NODE_ENV === 'development' && error.stack && (
                  <details className="mt-4 text-xs font-mono bg-destructive/10 p-3 rounded border border-destructive/20">
                    <summary className="cursor-pointer font-semibold mb-2">Stack Trace (Dev Only)</summary>
                    <pre className="whitespace-pre-wrap break-words overflow-auto max-h-60">
                      {error.stack}
                    </pre>
                  </details>
                )}
                {error.digest && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

