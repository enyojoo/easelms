# Payment Flow Documentation

## Overview

The platform supports two payment gateways:
- **Stripe**: For global payments (all currencies except NGN)
- **Flutterwave**: For Nigerian Naira (NGN) payments

## Payment Flow

### 1. Payment Intent Creation

When a user initiates a payment, the frontend calls:
```
POST /api/payments/create-intent
Body: { courseId, amountUSD }
```

The API:
1. Gets the user's preferred currency from their profile
2. Converts the USD amount to the user's currency
3. Determines the payment gateway:
   - **NGN** → Flutterwave
   - **All other currencies** → Stripe

### 2. Stripe Payment Flow

For Stripe payments, the API returns:
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "gateway": "stripe",
  "amount": 100.00,
  "currency": "USD",
  "exchangeRate": 1.0
}
```

**How it works:**
- The `clientSecret` is used with **Stripe Elements** (embedded payment form)
- The frontend integrates Stripe.js to show a secure payment form
- User enters card details directly on your site
- Stripe handles PCI compliance
- Payment is processed via Stripe Elements, not a hosted checkout page

**Frontend Implementation:**
```typescript
// Install: npm install @stripe/stripe-js @stripe/react-stripe-js
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Use clientSecret with Stripe Elements
<Elements stripe={stripePromise} options={{ clientSecret }}>
  <CardElement />
  <button onClick={handleSubmit}>Pay</button>
</Elements>
```

### 3. Flutterwave Payment Flow

For Flutterwave payments, the API returns:
```json
{
  "paymentLink": "https://checkout.flutterwave.com/v3/hosted/pay/xxx",
  "gateway": "flutterwave",
  "txRef": "tx_1234567890_userId",
  "amount": 150000.00,
  "currency": "NGN",
  "exchangeRate": 1500.0
}
```

**How it works:**
- The `paymentLink` is a **hosted payment page** URL
- User is redirected to Flutterwave's secure checkout page
- User completes payment on Flutterwave's site
- After payment, Flutterwave redirects back to your callback URL
- The callback URL verifies the payment and creates enrollment

**Frontend Implementation:**
```typescript
// Simply redirect user to the payment link
window.location.href = paymentLink
```

### 4. Payment Callbacks

#### Stripe Webhook
- Stripe sends webhook events to: `POST /api/payments/webhook/stripe`
- On `payment_intent.succeeded`, the system:
  1. Creates a payment record in the database
  2. Creates/updates enrollment for the user

#### Flutterwave Callback
- Flutterwave redirects to: `GET /api/payments/callback/flutterwave?transaction_id=xxx&tx_ref=xxx`
- The callback:
  1. Verifies the transaction with Flutterwave
  2. Creates a payment record in the database
  3. Creates/updates enrollment for the user
  4. Redirects user back to the courses page

## Current Implementation Status

### ✅ Implemented
- Payment intent creation API
- Currency conversion
- Gateway selection logic
- Stripe webhook handler
- Flutterwave callback handler
- Automatic enrollment after payment

### ⚠️ Needs Frontend Integration
- **Stripe**: Need to integrate Stripe Elements in the frontend
- **Flutterwave**: Need to redirect users to payment link (currently using mock)

### Current Mock Implementation
The `PaymentForm` component currently uses a mock form. It needs to be updated to:
1. Call `/api/payments/create-intent` to get payment details
2. For Stripe: Use Stripe Elements with the `clientSecret`
3. For Flutterwave: Redirect to the `paymentLink`

## Environment Variables Required

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Flutterwave
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_xxx
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_xxx

# App URL (for callbacks)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Summary

- **Stripe**: Uses **embedded payment form** (Stripe Elements) - user stays on your site
- **Flutterwave**: Uses **hosted payment page** - user is redirected to Flutterwave's site

Both methods are secure and handle PCI compliance. The choice depends on the user's currency.

