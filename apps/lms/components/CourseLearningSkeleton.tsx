import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function CourseLearningSkeleton() {
  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Skeleton className="h-9 w-20 mr-4" />
        <Skeleton className="h-6 w-64" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video player */}
          <Skeleton className="aspect-video w-full rounded-lg" />

          {/* Lesson content */}
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-7 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="space-y-4">
            <div className="flex gap-2 border-b">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>

        {/* Sidebar - Course content */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

