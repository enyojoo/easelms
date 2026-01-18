/**
 * Currency formatting utilities for platform-wide currency display
 * Uses platform default currency settings for consistent formatting
 */

export function formatCurrency(amount: number, currency: string): string {
  // Handle free courses
  if (amount === 0 || amount === undefined || amount === null) {
    return 'Free'
  }

  // For currencies with custom symbols that Intl.NumberFormat doesn't handle well
  const currencyCode = currency.toUpperCase()
  if (currencyCode === 'NGN') {
    return `₦${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Format currency using Intl.NumberFormat for proper localization
  // Show 2 decimal places for most currencies, but allow flexibility
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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