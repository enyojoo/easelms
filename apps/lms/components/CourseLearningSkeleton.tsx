import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CourseLearningSkeleton() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background z-50 touch-pan-y">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
          <div className="max-w-[1800px] mx-auto flex items-center gap-2 sm:gap-3">
            <Skeleton className="h-8 sm:h-9 md:h-10 w-8 sm:w-9 md:w-10 rounded" />
            <Skeleton className="h-5 sm:h-6 md:h-7 w-48 sm:w-64 md:w-80" />
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable container on mobile, fixed on desktop */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:w-[70%] order-1 lg:order-none min-h-0">
          <div className="flex-1 flex flex-col min-h-0 bg-card border-r border-border overflow-hidden">
            <Tabs defaultValue="video" className="flex-1 flex flex-col min-h-0">
              <TabsList className="flex-shrink-0 w-full justify-start bg-muted p-0 h-10 sm:h-12 border-b border-border">
                <TabsTrigger value="video" className="rounded-none h-10 sm:h-12 px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0">
                  <Skeleton className="h-4 w-16" />
                </TabsTrigger>
                <TabsTrigger value="quiz" className="rounded-none h-10 sm:h-12 px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0">
                  <Skeleton className="h-4 w-12" />
                </TabsTrigger>
                <TabsTrigger value="resources" className="rounded-none h-10 sm:h-12 px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0">
                  <Skeleton className="h-4 w-20" />
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 m-0 p-4 md:p-6 lg:p-8 overflow-y-auto min-h-0">
                <Skeleton className="aspect-video w-full rounded-lg mb-6" />
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </Tabs>
          </div>
        </div>

        {/* Sidebar / Course Content */}
        <div className="w-full lg:w-[30%] mb-6 lg:mb-0 order-2 lg:order-none lg:pl-6">
          <div className="rounded-lg border p-4 h-full overflow-auto shadow-lg space-y-4">
            <Skeleton className="h-6 w-1/2 mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

