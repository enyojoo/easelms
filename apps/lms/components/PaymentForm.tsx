"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { getClientAuthState } from "@/utils/client-auth"
import CurrencyConverter from "./CurrencyConverter"

interface PaymentFormProps {
  amountUSD: number
  courseId: number
  courseTitle: string
  onSuccess?: () => void
  onCancel?: () => void
}

// Mock exchange rates
const mockExchangeRates: Record<string, number> = {
  USD: 1.0,
  NGN: 1500.0,
  EUR: 0.92,
  GBP: 0.79,
}

export default function PaymentForm({ amountUSD, courseId, courseTitle, onSuccess, onCancel }: PaymentFormProps) {
  const [currency, setCurrency] = useState<string>("USD")
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCVC, setCardCVC] = useState("")
  const [cardName, setCardName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const { user } = getClientAuthState()
    const userCurrency = user?.currency || "USD"
    setCurrency(userCurrency)
    setPaymentMethod(userCurrency === "NGN" ? "flutterwave" : "stripe")
  }, [])

  const exchangeRate = mockExchangeRates[currency] || 1
  const convertedAmount = amountUSD * exchangeRate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validate form
    if (!cardNumber || !cardExpiry || !cardCVC || !cardName) {
      setError("Please fill in all card details")
      setLoading(false)
      return
    }

    // Mock payment processing
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
      }, 2000)
    }, 2000)
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground text-center">
              You have successfully enrolled in {courseTitle}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Course Info */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">{courseTitle}</p>
            <div className="flex items-baseline gap-2">
              <CurrencyConverter amountUSD={amountUSD} showRate={true} />
            </div>
          </div>

          {/* Payment Gateway Selection */}
          <div className="space-y-2">
            <Label>Payment Gateway</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe (Global)</SelectItem>
                <SelectItem value="flutterwave">Flutterwave (Nigeria)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {currency === "NGN" ? "Flutterwave is used for NGN payments" : "Stripe is used for global payments"}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardName">Cardholder Name</Label>
              <Input
                id="cardName"
                placeholder="John Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s/g, "")
                  if (value.length <= 16 && /^\d*$/.test(value)) {
                    setCardNumber(value.replace(/(.{4})/g, "$1 ").trim())
                  }
                }}
                maxLength={19}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardExpiry">Expiry Date</Label>
                <Input
                  id="cardExpiry"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "")
                    if (value.length <= 4) {
                      setCardExpiry(value.replace(/(.{2})/, "$1/").substring(0, 5))
                    }
                  }}
                  maxLength={5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardCVC">CVC</Label>
                <Input
                  id="cardCVC"
                  placeholder="123"
                  value={cardCVC}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "")
                    if (value.length <= 3) {
                      setCardCVC(value)
                    }
                  }}
                  maxLength={3}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currency,
                    }).format(convertedAmount)}
                  </>
                )}
              </Button>
            </div>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            This is a demo payment form. No actual charges will be made.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

