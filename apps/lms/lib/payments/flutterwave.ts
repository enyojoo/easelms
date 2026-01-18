import Flutterwave from "flutterwave-node-v3"

let flw: Flutterwave | null = null

function getFlutterwaveClient(): Flutterwave {
  if (!flw) {
    if (!process.env.FLUTTERWAVE_SECRET_KEY) {
      throw new Error("FLUTTERWAVE_SECRET_KEY is not set")
    }
    if (!process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY) {
      throw new Error("NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY is not set")
    }
    flw = new Flutterwave(
      process.env.FLUTTERWAVE_SECRET_KEY,
      process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY
    )
  }
  return flw
}

export async function initializePayment(data: {
  amount: number
  currency: string
  email: string
  tx_ref: string
  callback_url: string
  customer?: {
    name?: string
  }
  customizations?: {
    title?: string
    logo?: string
    description?: string
  }
  metadata?: Record<string, any>
}) {
  const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY
  if (!FLUTTERWAVE_SECRET_KEY) {
    throw new Error('FLUTTERWAVE_SECRET_KEY is not configured')
  }

  // Use Flutterwave's Standard payment API endpoint
  const response = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: data.tx_ref,
      amount: data.amount,
      currency: data.currency,
      redirect_url: data.callback_url,
      payment_options: 'card,mobilemoney,ussd',
      customer: {
        email: data.email,
        ...(data.customer?.name && { name: data.customer.name }),
      },
      ...(data.customizations && {
        customizations: {
          title: data.customizations.title,
          description: data.customizations.description,
          logo: data.customizations.logo,
        }
      }),
      meta: data.metadata,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Flutterwave API error:', errorData)
    throw new Error(`Flutterwave API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

export async function verifyTransaction(transactionId: string) {
  const client = getFlutterwaveClient()
  return await client.Transaction.verify({ id: transactionId })
}

