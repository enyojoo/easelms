"use client"

import { useState } from "react"
import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Calendar, Users } from "lucide-react"
import { workshops } from "../data/workshops"
import WorkshopPreviewModal from "../components/WorkshopPreviewModal"

function WorkshopsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWorkshop, setSelectedWorkshop] = useState<(typeof workshops)[0] | null>(null)

  // Rest of the component logic remains the same...

  return (
    // All the JSX remains the same
    <div>
      <h1>Plan Workshops</h1>
      <Input
        type="text"
        placeholder="Search workshops..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Button onClick={() => router.push("/create-workshop")}>
        <Plus className="mr-2 h-4 w-4" /> Create Workshop
      </Button>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workshops
          .filter((workshop) => workshop.title.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((workshop) => (
            <Card
              key={workshop.id}
              className="p-4 flex flex-col justify-between"
              onClick={() => setSelectedWorkshop(workshop)}
            >
              <div>
                <h2 className="text-lg font-bold">{workshop.title}</h2>
                <p className="text-sm text-muted-foreground">{workshop.description}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>{workshop.date}</span>
                </div>
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  <span>{workshop.attendees.length} attendees</span>
                </div>
              </div>
            </Card>
          ))}
      </div>
      {selectedWorkshop && (
        <WorkshopPreviewModal workshop={selectedWorkshop} onClose={() => setSelectedWorkshop(null)} />
      )}
    </div>
  )
}

export default function PlanWorkshopsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <WorkshopsContent />
    </Suspense>
  )
}
