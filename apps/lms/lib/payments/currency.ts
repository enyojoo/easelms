// Currency conversion utility with real-time exchange rates
// Uses exchangerate-api.com for live rates with caching and fallbacks

interface ExchangeRateData {
  rates: Record<string, number>
  base: string
  date: string
}

interface CachedRates {
  data: ExchangeRateData
  timestamp: number
  expiresAt: number
}

// Cache for exchange rates (5 minutes TTL)
let rateCache: CachedRates | null = null

// Fallback rates in case API fails
const fallbackRates: Record<string, number> = {
  USD: 1.0,
  NGN: 1500.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
}

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000

async function fetchExchangeRates(): Promise<ExchangeRateData> {
  const apiKey = process.env.EXCHANGERATE_API_KEY
  const baseUrl = 'https://api.exchangerate-api.com/v4/latest/USD'

  // Use API key if available, otherwise use free endpoint
  const url = apiKey ? `${baseUrl}?access_key=${apiKey}` : baseUrl

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes at edge
    })

    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.warn('Failed to fetch exchange rates from API:', error)
    throw error
  }
}

async function getCachedExchangeRates(): Promise<ExchangeRateData> {
  const now = Date.now()

  // Return cached rates if still valid
  if (rateCache && rateCache.expiresAt > now) {
    return rateCache.data
  }

  try {
    // Fetch fresh rates
    const data = await fetchExchangeRates()

    // Cache the rates
    rateCache = {
      data,
      timestamp: now,
      expiresAt: now + CACHE_TTL,
    }

    console.log(`Updated exchange rates from API (${Object.keys(data.rates).length} currencies)`)
    return data
  } catch (error) {
    console.warn('Exchange rate API failed, using cached/fallback rates')

    // Return cached rates if available (even if expired)
    if (rateCache) {
      console.log('Using expired cached rates as fallback')
      return rateCache.data
    }

    // Last resort: use fallback rates
    console.warn('Using hardcoded fallback rates')
    return {
      rates: fallbackRates,
      base: 'USD',
      date: new Date().toISOString().split('T')[0],
    }
  }
}

export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1.0

  try {
    const rateData = await getCachedExchangeRates()

    // All rates are relative to USD in the API
    const fromRate = fromCurrency === 'USD' ? 1.0 : rateData.rates[fromCurrency]
    const toRate = toCurrency === 'USD' ? 1.0 : rateData.rates[toCurrency]

    if (!fromRate || !toRate) {
      console.warn(`Exchange rate not found for ${fromCurrency} or ${toCurrency}, using fallback`)
      // Fallback to hardcoded rates
      const fallbackFromRate = fallbackRates[fromCurrency] || 1.0
      const fallbackToRate = fallbackRates[toCurrency] || 1.0
      return fallbackToRate / fallbackFromRate
    }

    return toRate / fromRate
  } catch (error) {
    console.error('Error getting exchange rate:', error)

    // Ultimate fallback
    const fallbackFromRate = fallbackRates[fromCurrency] || 1.0
    const fallbackToRate = fallbackRates[toCurrency] || 1.0
    return fallbackToRate / fallbackFromRate
  }
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  const rate = await getExchangeRate(fromCurrency, toCurrency)
  const converted = amount * rate

  // Log conversion for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`${amount} ${fromCurrency} = ${converted.toFixed(2)} ${toCurrency} (rate: ${rate.toFixed(4)})`)
  }

  return converted
}

// Utility function to get all available currencies
export async function getAvailableCurrencies(): Promise<string[]> {
  try {
    const rateData = await getCachedExchangeRates()
    return Object.keys(rateData.rates).concat(['USD']) // USD is always available
  } catch (error) {
    console.warn('Failed to get available currencies, using fallback list')
    return Object.keys(fallbackRates)
  }
}

// Utility function to check if currency is supported
export async function isCurrencySupported(currency: string): Promise<boolean> {
  const currencies = await getAvailableCurrencies()
  return currencies.includes(currency.toUpperCase())
}

