/**
 * Currency formatting utilities for platform-wide currency display
 * Uses platform default currency settings for consistent formatting
 */

export function formatCurrency(amount: number, currency: string): string {
  // Handle free courses
  if (amount === 0 || amount === undefined || amount === null) {
    return 'Free'
  }

  // Format currency using Intl.NumberFormat for proper localization
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  return formatter.format(amount)
}

/**
 * Convert and format currency from one currency to another
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Formatted string in target currency
 */
export async function convertAndFormatCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<string> {
  // Handle free courses
  if (amount === 0 || amount === undefined || amount === null) {
    return 'Free'
  }

  // If same currency, just format
  if (fromCurrency === toCurrency) {
    return formatCurrency(amount, toCurrency)
  }

  // Convert amount
  const convertedAmount = await convertCurrency(amount, fromCurrency, toCurrency)

  // Format in target currency
  return formatCurrency(convertedAmount, toCurrency)
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'USD':
      return '$'
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    case 'NGN':
      return '₦'
    default:
      return currency
  }
}