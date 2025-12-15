"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { getClientAuthState } from "@/utils/client-auth"

interface CurrencyConverterProps {
  amountUSD: number
  showRate?: boolean
  className?: string
}

// Mock exchange rates - in real app, this would come from an API
const mockExchangeRates: Record<string, number> = {
  USD: 1.0,
  NGN: 1500.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
}

export default function CurrencyConverter({ amountUSD, showRate = true, className }: CurrencyConverterProps) {
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [currency, setCurrency] = useState<string>("USD")
  const [loading, setLoading] = useState(true)
  const [exchangeRate, setExchangeRate] = useState<number>(1)

  useEffect(() => {
    const { user } = getClientAuthState()
    const userCurrency = user?.currency || "USD"
    setCurrency(userCurrency)

    // Simulate API call to get exchange rate
    setTimeout(() => {
      const rate = mockExchangeRates[userCurrency] || 1
      setExchangeRate(rate)
      setConvertedAmount(amountUSD * rate)
      setLoading(false)
    }, 500)
  }, [amountUSD])

  const formatCurrency = (amount: number, curr: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {convertedAmount !== null ? formatCurrency(convertedAmount, currency) : formatCurrency(amountUSD, "USD")}
          </span>
          {currency !== "USD" && (
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(amountUSD, "USD")}
            </span>
          )}
        </div>
        {showRate && currency !== "USD" && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Rate: 1 USD = {exchangeRate.toFixed(2)} {currency}</span>
            {exchangeRate > 1 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

