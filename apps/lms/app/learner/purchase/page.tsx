"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShoppingBag, XCircle, Calendar, DollarSign } from "lucide-react"
import Link from "next/link"
import { useClientAuthState } from "@/utils/client-auth"
import { cancelSubscription, type Purchase } from "@/utils/enrollment"
import type { User } from "@/data/users"

export default function PurchaseHistoryPage() {
  const router = useRouter()
  const { user: authUser, loading: authLoading, userType } = useClientAuthState()
  const [user, setUser] = useState<User | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([])

  useEffect(() => {
    if (!authLoading) {
      if (!authUser || userType !== "user") {
        router.push("/auth/learner/login")
        return
      }
      setUser(authUser as User)
      loadPurchaseData()
    }
  }, [authLoading, authUser, userType, router])

  const loadPurchaseData = async () => {
    if (!authUser) return

    try {
      setLoading(true)

      // Load purchases
      const purchasesResponse = await fetch("/api/purchases")
      if (purchasesResponse.ok) {
        const purchasesData = await purchasesResponse.json()
        setPurchases(purchasesData.purchases || [])
      } else {
        console.warn("Failed to fetch purchases:", purchasesResponse.status)
        setPurchases([])
      }

      // Load enrolled courses to match with purchases
      const enrollmentsResponse = await fetch("/api/enrollments")
      if (enrollmentsResponse.ok) {
        const enrollmentsData = await enrollmentsResponse.json()
        const enrollments = enrollmentsData.enrollments || []
        const enrolledIds = enrollments.map((e: any) => e.course_id).filter(Boolean)

        if (enrolledIds.length > 0) {
          const coursesResponse = await fetch(`/api/courses?ids=${enrolledIds.join(',')}`)
          if (coursesResponse.ok) {
            const coursesData = await coursesResponse.json()
            setEnrolledCourses(coursesData.courses || [])
          }
        }
      }
    } catch (error) {
      console.error("Error loading purchase data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="pt-4 md:pt-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading purchase history...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4 md:mb-8">Purchase History</h1>
      
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <ShoppingBag className="h-5 w-5 flex-shrink-0" />
            Purchases ({purchases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {purchases.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {purchases.map((purchase) => {
                // Find course from enrolled courses
                const course = enrolledCourses.find((c: any) => c.id === purchase.courseId)
                const isSubscription = purchase.type === "recurring"
                const isActive = purchase.status === "active"
                
                return (
                  <Card key={purchase.id} className={!isActive ? "opacity-75" : ""}>
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col gap-4 md:gap-5">
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="font-semibold text-base md:text-lg mb-2 break-words">{purchase.courseTitle}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={isSubscription ? "secondary" : "outline"}
                                className={
                                  isSubscription
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs"
                                }
                              >
                                {isSubscription ? "Subscription" : "One-time Purchase"}
                              </Badge>
                              <Badge
                                variant={isActive ? "default" : "secondary"}
                                className={
                                  isActive
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 text-xs"
                                }
                              >
                                {isActive ? "Active" : "Cancelled"}
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-2 text-xs md:text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                              <span className="break-words">
                                {purchase.currency} {purchase.amount}
                                {isSubscription && purchase.recurringPrice && " /month"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                              <span>
                                Purchased: {new Date(purchase.purchasedAt || purchase.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                            {purchase.cancelledAt && (
                              <div className="flex items-center gap-2">
                                <XCircle className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                                <span>
                                  Cancelled: {new Date(purchase.cancelledAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 border-t">
                          {course && (
                            <Link href={`/learner/courses/${course.id}`} className="flex-1 sm:flex-initial">
                              <Button variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px]">
                                View Course
                              </Button>
                            </Link>
                          )}
                          {isSubscription && isActive && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to cancel this subscription? You will be redirected to support to complete the cancellation.")) {
                                  cancelSubscription(purchase.id)
                                  setPurchases((prev) =>
                                    prev.map((p) =>
                                      p.id === purchase.id
                                        ? { ...p, status: "cancelled" as const, cancelledAt: new Date().toISOString() }
                                        : p
                                    )
                                  )
                                  router.push("/support")
                                }
                              }}
                              className="w-full sm:w-auto min-h-[44px]"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Subscription
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base mb-2">You don't have any purchases yet.</p>
              <Link href="/learner/courses">
                <Button className="mt-4 min-h-[44px]">Browse Courses</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

