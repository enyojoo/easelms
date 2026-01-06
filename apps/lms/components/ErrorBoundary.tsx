"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import ErrorState from "./ErrorState"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error("ErrorBoundary caught an error:", error, errorInfo)
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorMessage = this.state.error?.message || "An unexpected error occurred"
      const errorDetails = process.env.NODE_ENV === 'development' && this.state.errorInfo
        ? `\n\nStack trace:\n${this.state.error?.stack}\n\nComponent stack:\n${this.state.errorInfo.componentStack}`
        : ""

      return (
        <div className="p-4">
          <ErrorState
            title="Something went wrong"
            message={`${errorMessage}${errorDetails}`}
            onRetry={this.handleReset}
          />
        </div>
      )
    }

    return this.props.children
  }
}
