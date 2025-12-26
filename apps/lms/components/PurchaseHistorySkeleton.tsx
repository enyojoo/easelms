"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function PurchaseHistorySkeleton() {
  return (
    <>
      {/* Header */}
      <div className="mb-4 md:mb-8">
        <Skeleton className="h-9 w-48" />
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="space-y-3 md:space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col gap-4 md:gap-5">
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <div className="flex items-center gap-2 mb-3">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 border-t">
                      <Skeleton className="h-10 w-full sm:w-32" />
                      <Skeleton className="h-10 w-full sm:w-40" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

