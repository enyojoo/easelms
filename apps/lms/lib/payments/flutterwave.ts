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
  const client = getFlutterwaveClient()

  console.log('Flutterwave client methods:', Object.keys(client))
  console.log('Flutterwave client Payment:', client.Payment)
  console.log('Flutterwave client Charge:', client.Charge)

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

  console.log('Flutterwave payload:', payload)

  try {
    // Try different API methods based on Flutterwave library version
    if (client.Payment && typeof client.Payment.create === 'function') {
      console.log('Using client.Payment.create')
      return await client.Payment.create(payload)
    }
    else if (client.Payment && typeof client.Payment.initialize === 'function') {
      console.log('Using client.Payment.initialize')
      return await client.Payment.initialize(payload)
    }
    else if (client.Charge && typeof client.Charge.create === 'function') {
      console.log('Using client.Charge.create')
      return await client.Charge.create(payload)
    }
    // Try direct access as fallback
    else {
      console.warn('Standard API methods not found, trying direct access')
      const result = await (client as any).Payment?.create?.(payload) ||
                     await (client as any).Payment?.initialize?.(payload) ||
                     await (client as any).Charge?.create?.(payload)
      if (result) return result
    }

    throw new Error('No suitable Flutterwave API method found')
  } catch (error) {
    console.error('Flutterwave API call failed:', error)
    throw new Error(`Flutterwave payment initialization failed: ${error}`)
  }
}

export async function verifyTransaction(transactionId: string) {
  const client = getFlutterwaveClient()
  return await client.Transaction.verify({ id: transactionId })
}

