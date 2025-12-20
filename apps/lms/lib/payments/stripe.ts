import Stripe from "stripe"

let stripe: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
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

export async function createCheckoutSession(
  amount: number,
  currency: string,
  metadata: Record<string, string>,
  successUrl: string,
  cancelUrl: string,
  customerEmail: string,
  lineItemDescription?: string
) {
  const client = getStripeClient()
  return await client.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: customerEmail, // Required: pre-fill email in checkout
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: lineItemDescription || "Course Enrollment",
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  })
}

