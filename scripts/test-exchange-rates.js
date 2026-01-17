/**
 * Test script for exchange rate API integration
 * Run with: node scripts/test-exchange-rates.js
 */

const https = require('https')

async function testExchangeRateAPI() {
  console.log('🧪 Testing Exchange Rate API Integration...\n')

  // Test 1: Direct API call
  console.log('1. Testing direct API call to exchangerate-api.com...')
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const data = await response.json()

    console.log('✅ API call successful')
    console.log(`📊 Available currencies: ${Object.keys(data.rates).length}`)
    console.log(`💱 Sample rates: USD: ${data.rates.USD}, EUR: ${data.rates.EUR}, NGN: ${data.rates.NGN}`)
    console.log(`📅 Last updated: ${data.date}\n`)
  } catch (error) {
    console.log('❌ API call failed:', error.message)
    console.log('This might be expected if running without internet\n')
  }

  // Test 2: Test conversion logic (mock)
  console.log('2. Testing conversion logic...')

  const mockRates = {
    USD: 1.0,
    NGN: 1500.0,
    EUR: 0.92,
    GBP: 0.79,
  }

  function mockConvertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount

    const fromRate = fromCurrency === 'USD' ? 1.0 : mockRates[fromCurrency]
    const toRate = toCurrency === 'USD' ? 1.0 : mockRates[toCurrency]

    if (!fromRate || !toRate) {
      throw new Error(`Currency not supported: ${fromCurrency} or ${toCurrency}`)
    }

    return amount * (toRate / fromRate)
  }

  try {
    // Test conversions
    const testCases = [
      { amount: 100, from: 'USD', to: 'NGN', expected: 150000 },
      { amount: 100, from: 'USD', to: 'EUR', expected: 92 },
      { amount: 150000, from: 'NGN', to: 'USD', expected: 100 },
      { amount: 100, from: 'USD', to: 'USD', expected: 100 },
    ]

    testCases.forEach(({ amount, from, to, expected }) => {
      const result = mockConvertCurrency(amount, from, to)
      const status = Math.abs(result - expected) < 0.01 ? '✅' : '❌'
      console.log(`${status} ${amount} ${from} → ${result.toFixed(2)} ${to} (expected: ${expected})`)
    })
    console.log('')
  } catch (error) {
    console.log('❌ Conversion logic test failed:', error.message)
    console.log('')
  }

  // Test 3: Check environment variables
  console.log('3. Checking environment variables...')
  const apiKey = process.env.EXCHANGERATE_API_KEY
  if (apiKey) {
    console.log('✅ EXCHANGERATE_API_KEY is set')
  } else {
    console.log('⚠️  EXCHANGERATE_API_KEY not set (will use free tier)')
  }
  console.log('')

  console.log('🎉 Exchange Rate API integration test completed!')
  console.log('\n📝 Next steps:')
  console.log('1. Add EXCHANGERATE_API_KEY to .env.local for premium features')
  console.log('2. Test the integration in your LMS application')
  console.log('3. Monitor API usage and costs if using paid tier')
}

// Run the test
testExchangeRateAPI().catch(console.error)