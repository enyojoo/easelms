import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"

export default function CourseLearningSkeleton() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background z-50 touch-pan-y animate-in fade-in duration-200">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
          <div className="max-w-[1800px] mx-auto flex items-center gap-2 sm:gap-3">
            <Skeleton className="h-8 sm:h-9 md:h-10 w-8 sm:w-9 md:w-10 rounded" />
            <Skeleton className="h-5 sm:h-6 md:h-7 w-48 sm:w-64 md:w-80" />
            {/* Mobile menu button skeleton */}
            <Skeleton className="h-8 sm:h-9 md:h-10 w-8 sm:w-9 md:w-10 rounded lg:hidden ml-auto" />
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable container on mobile, fixed on desktop */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:w-[70%] order-1 lg:order-none min-h-0">
          <div className="flex-1 flex flex-col min-h-0 bg-card border-r border-border overflow-hidden rounded-none">
            <Tabs defaultValue="video" className="flex-1 flex flex-col min-h-0 rounded-none">
              <TabsList className="flex-shrink-0 w-full justify-start bg-muted p-0 h-10 sm:h-12 border-b border-border overflow-x-auto touch-pan-x">
                <TabsTrigger value="video" className="rounded-none h-10 sm:h-12 px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0">
                  <Skeleton className="h-4 w-16" />
                </TabsTrigger>
                <TabsTrigger value="text" className="rounded-none h-10 sm:h-12 px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0">
                  <Skeleton className="h-4 w-12" />
                </TabsTrigger>
                <TabsTrigger value="quiz" className="rounded-none h-10 sm:h-12 px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0">
                  <Skeleton className="h-4 w-12" />
                </TabsTrigger>
                <TabsTrigger value="resources" className="rounded-none h-10 sm:h-12 px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0">
                  <Skeleton className="h-4 w-20" />
                </TabsTrigger>
              </TabsList>

              {/* Video/Content Area */}
              <div className="flex-1 m-0 p-0 overflow-hidden min-h-0">
                <div className="relative w-full h-full bg-black">
                  <Skeleton className="absolute inset-0 w-full h-full" />
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="flex-shrink-0 p-3 sm:p-4 border-t border-border bg-background">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <Skeleton className="h-10 sm:h-12 flex-1 sm:flex-initial w-24 sm:w-32" />
                  <Skeleton className="h-10 sm:h-12 flex-1 sm:flex-initial w-24 sm:w-32" />
                </div>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Sidebar - Hidden on mobile/tablet, shown on desktop (lg+) */}
        <div className="hidden lg:flex flex-shrink-0 w-full lg:w-[30%] border-t lg:border-t-0 lg:border-l border-border bg-card order-2 lg:order-none flex flex-col min-h-0 lg:h-full">
          <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 md:p-5">
            <div className="mb-3 sm:mb-4 flex-shrink-0">
              <Skeleton className="h-4 sm:h-5 w-32 mb-2 sm:mb-2.5" />
              <div className="space-y-2 sm:space-y-2.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 sm:h-4 w-24" />
                  <Skeleton className="h-3 sm:h-4 w-12" />
                </div>
                <Progress value={0} className="h-1.5 sm:h-2 md:h-2.5" />
                <Skeleton className="h-3 sm:h-4 w-40" />
              </div>
            </div>
            <div className="border-t pt-3 sm:pt-4 flex-1 flex flex-col min-h-0">
              <Skeleton className="h-4 sm:h-5 w-32 mb-2.5 sm:mb-3 md:mb-4 flex-shrink-0" />
              <ScrollArea className="flex-1 min-h-0 w-full">
                <div className="space-y-1.5 sm:space-y-2 md:space-y-2.5 pr-2 sm:pr-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="w-full p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg border min-h-[44px] sm:min-h-[48px] flex items-center gap-2 sm:gap-3"
                    >
                      <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 rounded-full flex-shrink-0" />
                      <Skeleton className="h-4 sm:h-5 flex-1" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

