"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { motion } from "framer-motion"

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export default function ErrorState({ title = "Something went wrong", message, onRetry, className }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2">
          {message}
          {onRetry && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-4"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </motion.div>
          )}
        </AlertDescription>
      </Alert>
    </motion.div>
  )
}

