import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardSkeleton() {
  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 max-w-7xl mx-auto px-4 lg:px-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <Skeleton className="h-9 w-48" />
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <Skeleton className="h-10 w-16" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <Skeleton className="h-10 w-16" />
            </CardContent>
          </Card>
        </div>

        {/* Continue Learning and Recommended Courses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-2 flex-grow" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3 md:gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <Skeleton className="w-full h-32 sm:h-24 md:h-32" />
                    <div className="p-2 sm:p-3">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

