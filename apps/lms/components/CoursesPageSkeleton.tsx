import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CourseCardSkeleton from "./CourseCardSkeleton"

export default function CoursesPageSkeleton() {
  return (
    <>
      {/* Header */}
      <div className="flex items-center mb-4 md:mb-6">
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Search and Filters */}
      <div className="mb-4 md:mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-full sm:w-[180px]" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4 md:space-y-6">
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start sm:justify-center">
          <TabsTrigger value="all" className="flex-shrink-0">All Courses</TabsTrigger>
          <TabsTrigger value="enrolled" className="flex-shrink-0">Enrolled</TabsTrigger>
          <TabsTrigger value="completed" className="flex-shrink-0">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 md:mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}

