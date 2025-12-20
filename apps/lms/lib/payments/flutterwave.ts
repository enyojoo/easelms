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
      process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      process.env.FLUTTERWAVE_SECRET_KEY
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
  const client = getFlutterwaveClient()
  
  // Build payment payload according to Flutterwave Standard
  // Only email is required, name is optional
  const payload: any = {
    tx_ref: data.tx_ref,
    amount: data.amount.toString(),
    currency: data.currency,
    redirect_url: data.callback_url,
    customer: {
      email: data.email,
      ...(data.customer?.name && { name: data.customer.name }),
    },
    ...(data.customizations && { customizations: data.customizations }),
    ...(data.metadata && { meta: data.metadata }),
  }
  
  return await client.Payment.initialize(payload)
}

export async function verifyTransaction(transactionId: string) {
  const client = getFlutterwaveClient()
  return await client.Transaction.verify({ id: transactionId })
}

