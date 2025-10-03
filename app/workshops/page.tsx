"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Users, MapPin, Globe, Banknote, BookOpen } from "lucide-react"
import { getClientAuthState } from "@/app/utils/client-auth"
import type { User } from "@/app/data/users"

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
  courseName: string
  attended?: boolean
}

const currentDate = new Date()
currentDate.setHours(0, 0, 0, 0)

// Mock data for all workshops
const allWorkshops: Workshop[] = [
  // Upcoming workshops
  {
    id: 1,
    title: "Personal Branding for Young Entrepreneurs",
    date: "2025-01-15",
    time: "16:00",
    attendees: 45,
    isOnline: true,
    description: "Learn how to build and maintain your personal brand to stand out in the digital age.",
    price: 129,
    courseId: 4,
    courseName: "Public Speaking & Communication",
  },
  {
    id: 2,
    title: "Side Hustle Success Stories",
    date: "2025-01-22",
    time: "17:30",
    attendees: 60,
    isOnline: true,
    description: "Real entrepreneurs share their journey of building successful side businesses while studying.",
    price: 89,
    courseId: 5,
    courseName: "Building Side Hustles",
  },
  {
    id: 3,
    title: "AI Tools for Business Workshop",
    date: "2025-02-01",
    time: "15:00",
    attendees: 40,
    isOnline: true,
    description: "Discover how to leverage AI tools to automate and scale your business operations.",
    price: 149,
    courseId: 6,
    courseName: "Tech Skills (No-code, AI Basics)",
  },
  {
    id: 4,
    title: "Financial Planning for Teens",
    date: "2025-02-10",
    time: "14:00",
    attendees: 35,
    isOnline: false,
    address: "789 Finance Ave, Chicago, IL 60601",
    description: "Essential financial planning and money management skills for young entrepreneurs.",
    price: 99,
    courseId: 3,
    courseName: "Basic Money Management",
  },
  // Past workshops
  {
    id: 5,
    title: "Introduction to E-commerce",
    date: "2023-06-10",
    time: "11:00",
    attendees: 35,
    isOnline: true,
    description: "An introductory course to setting up and managing an e-commerce business.",
    price: 99,
    courseId: 3,
    courseName: "Basic Money Management",
  },
  {
    id: 6,
    title: "Personal Branding Workshop",
    date: "2023-06-20",
    time: "14:00",
    attendees: 28,
    isOnline: false,
    address: "456 Personal St, Los Angeles, CA 90001",
    description: "Learn how to build and maintain your personal brand for career success.",
    price: 149,
    courseId: 4,
    courseName: "Public Speaking & Communication",
  },
  {
    id: 7,
    title: "SEO Fundamentals",
    date: "2023-05-15",
    time: "13:00",
    attendees: 45,
    isOnline: true,
    description: "Master the basics of Search Engine Optimization to improve your website's visibility.",
    price: 199,
    courseId: 1,
    courseName: "Digital Marketing & Social Media",
  },
  {
    id: 8,
    title: "Content Marketing Strategies",
    date: "2023-06-25",
    time: "14:00",
    attendees: 32,
    isOnline: false,
    address: "789 Content Ave, Chicago, IL 60601",
    description: "Develop effective content marketing strategies to grow your audience and boost engagement.",
    price: 79,
    courseId: 1,
    courseName: "Digital Marketing & Social Media",
  },
  {
    id: 9,
    title: "Digital Marketing Strategies",
    date: "2023-07-15",
    time: "14:00",
    attendees: 25,
    isOnline: true,
    description: "Learn cutting-edge digital marketing techniques from industry experts.",
    price: 99,
    courseId: 1,
    courseName: "Digital Marketing & Social Media",
  },
  {
    id: 10,
    title: "A Guide to Startup Funding",
    date: "2023-07-22",
    time: "13:00",
    attendees: 30,
    isOnline: false,
    address: "123 Business St, New York, NY 10001",
    description: "Discover various funding options for your startup and how to approach investors.",
    price: 149,
    courseId: 2,
    courseName: "Startup Fundamentals",
  },
  {
    id: 11,
    title: "Blockchain for Beginners",
    date: "2025-03-05",
    time: "18:00",
    attendees: 50,
    isOnline: true,
    description:
      "Explore the fundamentals of blockchain technology and its potential applications in various industries.",
    price: 179,
    courseId: 6,
    courseName: "Tech Skills (No-code, AI Basics)",
  },
  {
    id: 12,
    title: "Social Media Marketing Masterclass",
    date: "2025-03-20",
    time: "14:30",
    attendees: 75,
    isOnline: true,
    description:
      "Learn advanced strategies for leveraging social media platforms to grow your brand and engage with your audience.",
    price: 159,
    courseId: 1,
    courseName: "Digital Marketing & Social Media",
  },
]

// Simulate attendance for past workshops
const pastWorkshops = allWorkshops
  .filter((workshop) => {
    const workshopDate = new Date(workshop.date)
    workshopDate.setHours(0, 0, 0, 0)
    return workshopDate < currentDate
  })
  .map((workshop, index) => ({
    ...workshop,
    attended: [0, 2, 4].includes(index), // Mark workshops at index 0, 2, and 4 as attended
  }))

export default function WorkshopsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("upcoming")

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "learner") {
      router.push("/login")
    } else {
      setUser(user)
    }
  }, [router])

  if (!user) {
    return <div>Loading...</div>
  }

  const upcomingWorkshops = allWorkshops.filter((workshop) => {
    const workshopDate = new Date(workshop.date)
    workshopDate.setHours(0, 0, 0, 0)
    return workshopDate >= currentDate
  })

  const pastWorkshopsFiltered = pastWorkshops

  const filteredUpcomingWorkshops = upcomingWorkshops.filter((workshop) =>
    workshop.title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredPastWorkshops = pastWorkshops.filter((workshop) =>
    workshop.title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const renderWorkshopCard = (workshop: Workshop, isPast = false) => (
    <Card key={workshop.id} className="bg-background-element border-border flex flex-col h-full">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex-grow">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold">{workshop.title}</h3>
            {isPast && (
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  workshop.attended ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {workshop.attended ? "Attended" : "Missed"}
              </span>
            )}
          </div>
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
              {workshop.isOnline ? (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  <span>{workshop.address}</span>
                </>
              )}
            </div>
            <div className="flex items-center">
              <Banknote className="mr-2 h-4 w-4" />
              <span>${workshop.price}</span>
            </div>
            <div className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Course: {workshop.courseName}</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{workshop.description}</p>
        </div>
        {!isPast && (
          <div className="pt-4 mt-auto">
            <Button className="w-full" onClick={() => console.log("Register for workshop:", workshop.id)}>
              Register
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className=" pt-4 md:pt-8">
      <div className="flex items-center mb-4">
        <h1 className="text-3xl font-bold text-primary">Workshops</h1>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search workshops..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm bg-background"
        />
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
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
