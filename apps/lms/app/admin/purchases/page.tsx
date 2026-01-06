"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShoppingBag, Calendar, DollarSign, Search, Loader2, User, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useClientAuthState } from "@/utils/client-auth"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import AdminPurchasesSkeleton from "@/components/AdminPurchasesSkeleton"
import { usePurchases, useRealtimeAdminStats } from "@/lib/react-query/hooks"

interface Purchase {
  id: string
  courseId: number
  courseTitle: string
  courseImage?: string
  amount: number
  currency: string
  gateway?: string
  status: string
  type: "one-time" | "recurring"
  recurringPrice?: number
  purchasedAt: string
  createdAt?: string
  completedAt?: string
  cancelledAt?: string
  userId?: string
  userName?: string
  userEmail?: string
  transactionId?: string
}

export default function AdminPurchasesPage() {
  const router = useRouter()
  const { user, loading: authLoading, userType } = useClientAuthState()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Use React Query hooks for data fetching with caching
  const { data: purchasesData, isPending: purchasesPending, error: purchasesError } = usePurchases({ all: true })
  
  // Set up real-time subscription for purchases (via admin stats)
  useRealtimeAdminStats()
  
  // Process purchases data from React Query
  const purchases = useMemo(() => {
    if (!purchasesData?.purchases) return []
    return purchasesData.purchases
  }, [purchasesData])

  useEffect(() => {
    if (!authLoading && (!user || userType !== "admin")) {
      router.push("/auth/admin/login")
    }
  }, [user, userType, authLoading, router])

  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch =
      purchase.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || purchase.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Show skeleton ONLY on true initial load (no cached data exists)
  // Once we have data, never show skeleton again (even during refetches)
  const hasData = purchasesData
  const showSkeleton = (authLoading || !user || userType !== "admin") && !hasData

  return (
    <div className="pt-4 md:pt-8">
      {showSkeleton ? (
        <AdminPurchasesSkeleton />
      ) : purchasesError ? (
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error loading purchases</h3>
          <p className="text-sm text-muted-foreground mb-4">{purchasesError.message || "Failed to load purchases"}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">Purchase Management</h1>
              <p className="text-muted-foreground">
                View and manage all purchases and transactions
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <CardTitle className="flex items-center">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  All Purchases ({filteredPurchases.length})
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by course, user, or transaction ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No purchases found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPurchases.map((purchase) => {
                        const isSubscription = purchase.type === "recurring"
                        const isActive = purchase.status === "completed"

                        return (
                          <TableRow key={purchase.id}>
                            <TableCell>
                              {purchase.userName ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>{purchase.userName.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{purchase.userName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{purchase.userEmail}</p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Unknown User</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{purchase.courseTitle}</p>
                                <p className="text-xs text-muted-foreground">Course ID: {purchase.courseId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {purchase.currency || "USD"} {purchase.amount}
                                  {isSubscription && purchase.recurringPrice && " /month"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={isActive ? "default" : "secondary"}
                                className={
                                  isActive
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                }
                              >
                                {purchase.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={isSubscription ? "secondary" : "outline"}
                                className={
                                  isSubscription
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                }
                              >
                                {isSubscription ? "Subscription" : "One-time"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {new Date(purchase.purchasedAt || purchase.createdAt || "").toLocaleDateString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {purchase.transactionId ? (
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {purchase.transactionId.substring(0, 12)}...
                                </code>
                              ) : (
                                <span className="text-muted-foreground text-xs">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {purchase.userId && (
                                  <Link href={`/admin/learners/${purchase.userId}`}>
                                    <Button variant="outline" size="sm">
                                      <User className="h-4 w-4 mr-1" />
                                      View User
                                    </Button>
                                  </Link>
                                )}
                                <Link href={`/admin/courses/${purchase.courseId}`}>
                                  <Button variant="outline" size="sm">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

