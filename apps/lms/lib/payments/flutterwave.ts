import Flutterwave from "flutterwave-node-v3"

if (!process.env.FLUTTERWAVE_SECRET_KEY) {
  throw new Error("FLUTTERWAVE_SECRET_KEY is not set")
}

const flw = new Flutterwave(
  process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!,
  process.env.FLUTTERWAVE_SECRET_KEY
)

export async function initializePayment(data: {
  amount: number
  currency: string
  email: string
  tx_ref: string
  callback_url: string
  metadata?: Record<string, any>
}) {
  return await flw.Payment.initialize(data)
}

export async function verifyTransaction(transactionId: string) {
  return await flw.Transaction.verify({ id: transactionId })
}

