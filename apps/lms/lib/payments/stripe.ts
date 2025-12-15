import Stripe from "stripe"

let stripe: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    })
  }
  return stripe
}

export async function createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>) {
  const client = getStripeClient()
  return await client.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: currency.toLowerCase(),
    metadata,
  })
}

export async function confirmPaymentIntent(paymentIntentId: string) {
  const client = getStripeClient()
  return await client.paymentIntents.retrieve(paymentIntentId)
}

