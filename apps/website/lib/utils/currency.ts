export function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  } catch (error) {
    // Fallback formatting
    return `$${amount.toFixed(2)}`
  }
}

export function getCurrencySymbol(currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0).replace(/\d/g, "").trim()
  } catch (error) {
    return "$"
  }
}