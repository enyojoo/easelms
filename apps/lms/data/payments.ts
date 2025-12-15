export interface Payment {
  id: string
  userId: string
  courseId: number
  amountUSD: number
  amount: number
  currency: string
  exchangeRate: number
  gateway: "stripe" | "flutterwave"
  status: "pending" | "completed" | "failed" | "refunded"
  transactionId?: string
  paymentMethod?: string
  createdAt: Date
  completedAt?: Date
}

export const payments: Payment[] = [
  {
    id: "1",
    userId: "1",
    courseId: 3,
    amountUSD: 49.0,
    amount: 49.0,
    currency: "USD",
    exchangeRate: 1.0,
    gateway: "stripe",
    status: "completed",
    transactionId: "stripe_txn_123456",
    paymentMethod: "card",
    createdAt: new Date("2024-01-12"),
    completedAt: new Date("2024-01-12"),
  },
  {
    id: "2",
    userId: "2",
    courseId: 1,
    amountUSD: 99.0,
    amount: 148500.0,
    currency: "NGN",
    exchangeRate: 1500.0,
    gateway: "flutterwave",
    status: "completed",
    transactionId: "flw_txn_789012",
    paymentMethod: "card",
    createdAt: new Date("2024-01-05"),
    completedAt: new Date("2024-01-05"),
  },
  {
    id: "3",
    userId: "1",
    courseId: 4,
    amountUSD: 29.0,
    amount: 29.0,
    currency: "USD",
    exchangeRate: 1.0,
    gateway: "stripe",
    status: "pending",
    createdAt: new Date("2024-01-20"),
  },
]

export function getPaymentsByUser(userId: string): Payment[] {
  return payments.filter((p) => p.userId === userId)
}

export function getPaymentsByCourse(courseId: number): Payment[] {
  return payments.filter((p) => p.courseId === courseId)
}

export function getTotalRevenue(): number {
  return payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amountUSD, 0)
}

export function getRevenueByGateway(gateway: "stripe" | "flutterwave"): number {
  return payments
    .filter((p) => p.status === "completed" && p.gateway === gateway)
    .reduce((sum, p) => sum + p.amountUSD, 0)
}

