import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminSettingsSkeleton() {
  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="space-y-6">
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg w-full grid grid-cols-3 gap-2">
            <TabsTrigger value="notifications" disabled>
              <Skeleton className="h-4 w-32" />
            </TabsTrigger>
            <TabsTrigger value="users" disabled>
              <Skeleton className="h-4 w-24" />
            </TabsTrigger>
            <TabsTrigger value="team" disabled>
              <Skeleton className="h-4 w-20" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2 pb-6 border-b">
                    <Skeleton className="h-5 w-32 mb-4" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </div>
                  <div className="space-y-6">
                    <Skeleton className="h-6 w-48" />
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

