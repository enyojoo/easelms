"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function FullPageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile Header Skeleton - matches MobileMenu height */}
      <div className="lg:hidden h-16 border-b border-border bg-background-element fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between px-4 h-full">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Desktop Layout - matches ClientLayout structure exactly */}
      <div className="hidden lg:flex h-screen">
        {/* Sidebar Skeleton - matches LeftSidebar structure */}
        <div className="w-64 h-screen bg-background-element border-r border-border py-4 flex flex-col fixed left-0 top-0">
          {/* Logo area - matches LeftSidebar px-6 mb-8 */}
          <div className="mb-8 px-6">
            <Skeleton className="h-12 w-40" />
          </div>
          {/* Navigation items - matches LeftSidebar px-2 */}
          <nav className="flex-grow px-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full mb-2" />
            ))}
          </nav>
          {/* Bottom menu - matches LeftSidebar border-t pt-4 */}
          <div className="mt-auto px-2 border-t border-border pt-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full mb-2" />
            ))}
          </div>
        </div>

        {/* Main Content Area - matches ClientLayout structure */}
        <div className="flex flex-col flex-grow lg:ml-64">
          {/* Header Skeleton - matches Header height and styling */}
          <div className="h-16 border-b border-border bg-background-element/80 backdrop-blur-md fixed top-0 right-0 lg:left-64 z-10">
            <div className="flex items-center justify-end px-6 h-full">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>

          {/* Content Skeleton - matches container-fluid structure */}
          <div className="flex-grow overflow-y-auto lg:pt-16 pb-8">
            <main className="container-fluid">
              <div className="pt-4 md:pt-8 pb-4 md:pb-8">
                <Skeleton className="h-9 w-48 mb-4 md:mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                  {[1, 2].map((i) => (
                    <div key={i} className="border rounded-lg p-4 md:p-6">
                      <Skeleton className="h-6 w-32 mb-4" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  {[1, 2].map((i) => (
                    <div key={i} className="border rounded-lg p-4 md:p-6">
                      <Skeleton className="h-6 w-40 mb-4" />
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Mobile Content Skeleton - matches ClientLayout mobile structure */}
      <div className="lg:hidden flex-grow overflow-y-auto mt-16 mb-16 pb-4">
        <main className="container-fluid">
          <div className="pt-4 pb-4">
            <Skeleton className="h-9 w-48 mb-4 md:mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-6 w-32 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

