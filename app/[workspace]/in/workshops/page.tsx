"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Users, MapPin, Edit, Play, Plus, Trash2, Banknote, BookOpen } from "lucide-react"
import { getClientAuthState } from "@/app/utils/client-auth"
import type { User } from "@/app/data/users"
import { modules } from "@/app/data/courses"

interface Workshop {
  id: number
  title: string
  date: string
  time: string
  attendees: number
  isOnline: boolean
  address?: string
  description: string
  price: number
  courseId: number
}

const upcomingWorkshops: Workshop[] = [
  {
    id: 1,
    title: "Digital Marketing Strategies",
    date: "2023-07-15",
    time: "14:00",
    attendees: 25,
    isOnline: true,
    description: "Learn cutting-edge digital marketing techniques from industry experts.",
    price: 99,
    courseId: 1,
  },
  {
    id: 2,
    title: "A Guide to Startup Funding",
    date: "2023-07-22",
    time: "13:00",
    attendees: 30,
    isOnline: false,
    address: "123 Business St, New York, NY 10001",
    description: "Discover various funding options for your startup and how to approach investors.",
    price: 149,
    courseId: 2,
  },
  {
    id: 3,
    title: "Social Media Marketing Masterclass",
    date: "2023-08-05",
    time: "15:00",
    attendees: 40,
    isOnline: true,
    description: "Master the art of social media marketing across multiple platforms.",
    price: 199,
    courseId: 1,
  },
  {
    id: 4,
    title: "Local Business Networking Event",
    date: "2023-08-12",
    time: "18:00",
    attendees: 50,
    isOnline: false,
    address: "456 Main St, San Francisco, CA 94122",
    description: "Connect with local business owners and entrepreneurs in this networking event.",
    price: 79,
    courseId: 2,
  },
  {
    id: 5,
    title: "E-commerce Optimization Workshop",
    date: "2023-08-20",
    time: "10:00",
    attendees: 35,
    isOnline: true,
    description: "Learn how to optimize your e-commerce store for better conversions and sales.",
    price: 129,
    courseId: 3,
  },
]

const pastWorkshops: Workshop[] = [
  {
    id: 101,
    title: "Introduction to E-commerce",
    date: "2023-06-10",
    time: "11:00",
    attendees: 35,
    isOnline: true,
    description: "An introductory course to setting up and managing an e-commerce business.",
    price: 99,
    courseId: 3,
  },
  {
    id: 102,
    title: "Personal Branding Workshop",
    date: "2023-06-20",
    time: "14:00",
    attendees: 28,
    isOnline: false,
    address: "456 Personal St, Los Angeles, CA 90001",
    description: "Learn how to build and maintain your personal brand for career success.",
    price: 149,
    courseId: 4,
  },
  {
    id: 103,
    title: "SEO Fundamentals",
    date: "2023-05-15",
    time: "13:00",
    attendees: 45,
    isOnline: true,
    description: "Master the basics of Search Engine Optimization to improve your website's visibility.",
    price: 199,
    courseId: 1,
  },
  {
    id: 104,
    title: "Content Marketing Strategies",
    date: "2023-06-25",
    time: "14:00",
    attendees: 32,
    isOnline: false,
    address: "789 Content Ave, Chicago, IL 60601",
    description: "Develop effective content marketing strategies to grow your audience and boost engagement.",
    price: 79,
    courseId: 1,
  },
]

function PlanWorkshopsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get("tab") || "upcoming"
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currency, setCurrency] = useState("USD")

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "instructor") {
      router.push("/login")
    } else {
      setUser(user)
    }
  }, [router])

  useEffect(() => {
    const { user } = getClientAuthState()
    if (user && user.currency) {
      setCurrency(user.currency)
    }
  }, [])

  if (!user) {
    return <div>Loading...</div>
  }

  const filteredUpcomingWorkshops = upcomingWorkshops.filter((workshop) =>
    workshop.title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredPastWorkshops = pastWorkshops.filter((workshop) =>
    workshop.title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDeleteWorkshop = (workshopId: number) => {
    console.log(`Deleting workshop with id: ${workshopId}`)
  }

  const renderWorkshopCard = (workshop: Workshop, isPast = false) => {
    const linkedCourse = modules.find((course) => course.id === workshop.courseId)

    return (
      <Card key={workshop.id} className="flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-lg">{workshop.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              <span>{workshop.date}</span>
            </div>
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              <span>{workshop.time}</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              <span>{workshop.attendees} attendees</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              <span>{workshop.isOnline ? "Online" : workshop.address}</span>
            </div>
            <div className="flex items-center">
              <Banknote className="mr-2 h-4 w-4" />
              <span>${workshop.price}</span>
            </div>
            <div className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Course: {linkedCourse ? linkedCourse.title : "N/A"}</span>
            </div>
          </div>
          <p className="mt-4 text-sm">{workshop.description}</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 mt-auto">
          <div className={`grid ${!isPast && workshop.isOnline ? "grid-cols-3" : "grid-cols-2"} gap-2 w-full`}>
            {!isPast && (
              <Link href={`/plan-workshops/edit/${workshop.id}`} passHref>
                <Button variant="outline" className="w-full">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
              </Link>
            )}
            {!isPast && workshop.isOnline && (
              <Button className="w-full">
                <Play className="mr-2 h-4 w-4" /> Start
              </Button>
            )}
            <Button variant="destructive" onClick={() => handleDeleteWorkshop(workshop.id)} className="w-full">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="pt-4 md:pt-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Workshops</h1>
        <Link href="/plan-workshops/new" passHref>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        </Link>
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

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Workshops</TabsTrigger>
          <TabsTrigger value="past">Past Workshops</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUpcomingWorkshops.map((workshop) => renderWorkshopCard(workshop))}
          </div>
        </TabsContent>
        <TabsContent value="past">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPastWorkshops.map((workshop) => renderWorkshopCard(workshop, true))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function PlanWorkshopsPage() {
  return (
    <Suspense fallback={<div>Loading Workshops...</div>}>
      <PlanWorkshopsContent />
    </Suspense>
  )
}

