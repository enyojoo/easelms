"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { getClientAuthState } from "@/app/utils/client-auth"
import type { User } from "@/app/data/users"
import { Award, Trophy, BadgeIcon as Certificate, Star, Download } from "lucide-react"

// Mock data for achievements
const mockAchievements = [
  { id: 1, name: "First Course Completed", description: "Complete your first course", icon: Award },
  { id: 2, name: "Quiz Master", description: "Score 100% on 5 quizzes", icon: Star },
  { id: 3, name: "Workshop Enthusiast", description: "Attend 3 workshops", icon: Certificate },
  { id: 4, name: "Consistent Learner", description: "Log in for 7 consecutive days", icon: Trophy },
]

// Mock data for leaderboard
const mockLeaderboard = [
  { id: 1, name: "Alice Johnson", points: 1250 },
  { id: 2, name: "Bob Smith", points: 1100 },
  { id: 3, name: "Charlie Brown", points: 950 },
  { id: 4, name: "David Lee", points: 800 },
  { id: 5, name: "Eva Martinez", points: 750 },
  { id: 6, name: "Frank Wilson", points: 700 },
  { id: 7, name: "Grace Taylor", points: 650 },
  { id: 8, name: "Henry Davis", points: 600 },
]

// Mock data for certificates
const mockCertificates = [
  { id: 1, name: "Digital Marketing & Social Media", type: "course", date: "2023-12-15" },
  { id: 2, name: "Startup Fundamentals", type: "course", date: "2024-01-10" },
  { id: 3, name: "Social Media Marketing Workshop", type: "workshop", date: "2024-01-20" },
]

const handleDownload = (certId: number, certName: string) => {
  // In a real application, this would trigger a download of the actual certificate
  console.log(`Downloading certificate: ${certName} (ID: ${certId})`)
  // Simulating a download with an alert
  alert(`Certificate "${certName}" is being downloaded.`)
}

export default function AchievementsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

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

  const renderLeaderboardItem = (item: (typeof mockLeaderboard)[0], index: number) => {
    const medals = ["🥇", "🥈", "🥉"]
    return (
      <div key={item.id} className="flex items-center justify-between py-2">
        <div className="flex items-center">
          <span className="w-8 text-center">{index + 1}</span>
          {index < 3 ? (
            <span className="mr-2">{medals[index]}</span>
          ) : (
            <span className="w-6 mr-2"></span> // Placeholder for alignment
          )}
          <span>{item.name}</span>
        </div>
        <span>{item.points} points</span>
      </div>
    )
  }

  return (
    <div className=" pt-4 md:pt-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Achievements</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="mr-2" /> Total Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">1,250</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="mr-2" /> Badges Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">8 / 12</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Certificate className="mr-2" /> Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{mockCertificates.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {mockAchievements.map((achievement) => (
                <div key={achievement.id} className="flex flex-col items-center text-center p-4 border rounded-lg">
                  <achievement.icon className="w-12 h-12 mb-2 text-primary" />
                  <h3 className="font-semibold mb-1">{achievement.name}</h3>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>{mockLeaderboard.map(renderLeaderboardItem)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Certificates</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="course">Courses</TabsTrigger>
              <TabsTrigger value="workshop">Workshops</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {mockCertificates.map((cert) => (
                <div key={cert.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div>
                    <p className="font-semibold">{cert.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {cert.type} | {cert.date}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(cert.id, cert.name)}>
                    <Download className="w-4 h-4 mr-1" /> Download
                  </Button>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="course">
              {mockCertificates
                .filter((cert) => cert.type === "course")
                .map((cert) => (
                  <div key={cert.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-semibold">{cert.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {cert.type} | {cert.date}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(cert.id, cert.name)}>
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                  </div>
                ))}
            </TabsContent>
            <TabsContent value="workshop">
              {mockCertificates
                .filter((cert) => cert.type === "workshop")
                .map((cert) => (
                  <div key={cert.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-semibold">{cert.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {cert.type} | {cert.date}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(cert.id, cert.name)}>
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                  </div>
                ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

