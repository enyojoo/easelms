"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingBag, Calendar } from "lucide-react"
import Link from "next/link"
import { useClientAuthState } from "@/utils/client-auth"
import { createCourseSlug } from "@/lib/slug"
import { formatCurrency } from "@/lib/utils/currency"
import PurchaseHistorySkeleton from "@/components/PurchaseHistorySkeleton"
import { usePurchases, type Purchase } from "@/lib/react-query/hooks/usePurchases"
import { usePurchasePrice } from "@/lib/react-query/hooks/useCoursePrice"
import { useEnrollments } from "@/lib/react-query/hooks/useEnrollments"
import { useRealtimePurchases } from "@/lib/react-query/hooks/useRealtime"
import { usePageSkeleton } from "@/lib/react-query/hooks/useSkeleton"
import { useAppQuery } from "@/lib/react-query/hooks/useAppCache"
import { toast } from "sonner"

export default function PurchaseHistoryPage() {
  const router = useRouter()
  const { user, loading: authLoading, userType } = useClientAuthState()

  // Fetch purchases, enrollments, and courses using React Query
  const { data: purchasesData, isPending: purchasesPending } = usePurchases()
  const { data: enrollmentsData, isPending: enrollmentsPending } = useEnrollments()

  // Set up real-time subscription for purchases
  useRealtimePurchases(user?.id)

  // Get enrolled course IDs (sorted for stable query key)
  const enrolledIds = enrollmentsData?.enrollments
    ?.map((e) => e.course_id)
    .filter(Boolean)
    .sort((a, b) => a - b) || []

  const enrolledIdsKey = enrolledIds.join(',')

  // Fetch courses for enrolled IDs using unified query system
  const { data: coursesData, isPending: coursesPending } = useAppQuery(
    'courses',
    ["courses", "enrolled", enrolledIdsKey],
    async () => {
      if (enrolledIds.length === 0) {
        return { courses: [] }
      }
      const response = await fetch(`/api/courses?ids=${enrolledIdsKey}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch courses")
      }
      return response.json()
    },
    { enabled: enrolledIds.length > 0 }
  )

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading) {
      if (!user || userType !== "user") {
        router.push("/auth/learner/login")
      }
    }
  }, [authLoading, user, userType, router])

  // Unified caching system handles data fetching automatically

  const purchases: Purchase[] = purchasesData?.purchases || []
  const enrolledCourses = coursesData?.courses || []
  
  // Use unified skeleton logic - show skeleton only on first load with no cached data
  const showSkeleton = usePageSkeleton(authLoading, !!user && userType === "user", [purchasesData, enrollmentsData])

  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
      {showSkeleton ? (
        <PurchaseHistorySkeleton />
      ) : (
        <>
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4 md:mb-8">Purchase History</h1>

      <Card>
        <CardContent className="p-4 md:p-6">
          {purchases.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {purchases.map((purchase) => {
                // Find course from enrolled courses
                const course = enrolledCourses.find((c: any) => c.id === purchase.courseId)

                return (
                  <Card key={purchase.id}>
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col gap-4 md:gap-5">
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="font-semibold text-base md:text-lg mb-2 break-words">{purchase.courseTitle}</h3>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                              One-time Purchase
                            </Badge>
                          </div>
                          <div className="space-y-2 text-xs md:text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium flex-shrink-0">
                                Amount:
                              </span>
                              <span className="break-words">
                                {formatCurrency(purchase.amount, purchase.currency)}
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
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 border-t">
                          {course && (
                            <Link href={`/learner/courses/${createCourseSlug(course.title, course.id)}`} className="flex-1 sm:flex-initial">
                              <Button variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px]">
                                View Course
                              </Button>
                            </Link>
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
        </>
      )}
    </div>
  )
}

