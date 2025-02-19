"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Users, Video } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@/app/data/users"

export default function WorkshopsPage({ params }: { params: { workspace: string } }) {
  const [workshops, setWorkshops] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const fetchWorkshops = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/${params.workspace}/login`)
        return
      }

      const { data, error } = await supabase.from("workshops").select("*")

      if (error) {
        console.error("Error fetching workshops:", error)
      } else {
        setWorkshops(data)
      }
      setUser(user)
    }

    fetchWorkshops()
  }, [router, supabase, params.workspace])

  if (!user) {
    return <div>Loading...</div>
  }

  const upcomingWorkshops = workshops.filter((workshop) => new Date(workshop.date) > new Date())
  const pastWorkshops = workshops.filter((workshop) => new Date(workshop.date) <= new Date())

  const filterWorkshops = (workshops) =>
    workshops.filter((workshop) => workshop.title.toLowerCase().includes(searchTerm.toLowerCase()))

  const renderWorkshopCard = (workshop) => {
    const isUpcoming = new Date(workshop.date) > new Date()

    return (
      <Card key={workshop.id} className="flex flex-col h-full">
        <CardHeader className="p-6">
          <CardTitle className="text-lg mb-2">{workshop.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>{new Date(workshop.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>{workshop.duration} minutes</span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{workshop.attendees || 0} attendees</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow px-6 pb-6">
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{workshop.description}</p>
        </CardContent>
        <CardFooter className="flex gap-2 p-6 pt-0">
          {isUpcoming ? (
            <Button asChild className="flex-1">
              <Link href={`/${params.workspace}/workshops/${workshop.id}`}>Register</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/${params.workspace}/workshops/${workshop.id}`}>
                <Video className="w-4 h-4 mr-2" />
                Watch Recording
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="pt-4 md:pt-8">
      <div className="flex items-center mb-4">
        <h1 className="text-3xl font-bold text-primary">Workshops</h1>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search workshops..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Workshops</TabsTrigger>
          <TabsTrigger value="past">Past Workshops</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {filterWorkshops(upcomingWorkshops).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterWorkshops(upcomingWorkshops).map((workshop) => renderWorkshopCard(workshop))}
            </div>
          ) : (
            <p className="text-muted-foreground">No upcoming workshops found.</p>
          )}
        </TabsContent>

        <TabsContent value="past">
          {filterWorkshops(pastWorkshops).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterWorkshops(pastWorkshops).map((workshop) => renderWorkshopCard(workshop))}
            </div>
          ) : (
            <p className="text-muted-foreground">No past workshops found.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

