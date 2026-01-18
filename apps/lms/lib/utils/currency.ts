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