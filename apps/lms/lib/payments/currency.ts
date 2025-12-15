// Currency conversion utility
// In production, use a real exchange rate API like exchangerate-api.com

const mockExchangeRates: Record<string, number> = {
  USD: 1.0,
  NGN: 1500.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
}

export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  // In production, fetch from an API
  // For now, use mock rates
  if (fromCurrency === toCurrency) return 1.0
  
  const fromRate = mockExchangeRates[fromCurrency] || 1.0
  const toRate = mockExchangeRates[toCurrency] || 1.0
  
  return toRate / fromRate
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  const rate = await getExchangeRate(fromCurrency, toCurrency)
  return amount * rate
}

