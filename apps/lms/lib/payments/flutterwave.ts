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
  metadata?: Record<string, any>
}) {
  const client = getFlutterwaveClient()
  return await client.Payment.initialize(data)
}

export async function verifyTransaction(transactionId: string) {
  const client = getFlutterwaveClient()
  return await client.Transaction.verify({ id: transactionId })
}

