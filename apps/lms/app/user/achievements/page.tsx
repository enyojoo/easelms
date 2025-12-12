"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import { Download, Award } from "lucide-react"

// Mock data for certificates
const mockCertificates = [
  { id: 1, name: "Digital Marketing & Social Media", type: "course", date: "2023-12-15" },
  { id: 2, name: "Startup Fundamentals", type: "course", date: "2024-01-10" },
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
    if (!isLoggedIn || userType !== "user") {
      router.push("/auth/user/login")
    } else {
      setUser(user)
    }
  }, [router])

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="pt-4 md:pt-8">
      <div className="flex items-center gap-3 mb-8">
        <Award className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Achievements</h1>
      </div>

      <Card>
        <CardContent>
          {mockCertificates.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No certificates available yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete courses to earn certificates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mockCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex justify-between items-center p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{cert.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Course Certificate • Completed on {new Date(cert.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(cert.id, cert.name)}
                    className="ml-4"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
