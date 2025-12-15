"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import { Award, Loader2, Trophy } from "lucide-react"
import { achievements, getAchievementsByUser, type Achievement } from "@/data/achievements"
import AchievementBadge from "@/components/AchievementBadge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AchievementsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [earnedAchievements, setEarnedAchievements] = useState<(Achievement & { earnedAt: Date })[]>([])
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([])

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "user") {
      router.push("/auth/learner/login")
    } else {
      setUser(user)
      if (user?.id) {
        const earned = getAchievementsByUser(user.id.toString())
        setEarnedAchievements(earned)
        setAllAchievements(achievements)
      }
    }
  }, [router])

  if (!user) {
    return (
      <div className="pt-4 md:pt-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const earnedAchievementIds = new Set(earnedAchievements.map((a) => a.id))
  const unearnedAchievements = allAchievements.filter((a) => !earnedAchievementIds.has(a.id))
  const totalPoints = earnedAchievements.reduce((sum, a) => sum + a.points, 0)

  return (
    <div className="pt-4 md:pt-8">
      <div className="flex items-center gap-3 mb-8">
        <Award className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Achievements</h1>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Earned</p>
                <p className="text-2xl font-bold">{earnedAchievements.length}</p>
              </div>
              <Trophy className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Points</p>
                <p className="text-2xl font-bold">{totalPoints}</p>
              </div>
              <Award className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available</p>
                <p className="text-2xl font-bold">{allAchievements.length}</p>
              </div>
              <Award className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="earned" className="space-y-4">
        <TabsList>
          <TabsTrigger value="earned">Earned ({earnedAchievements.length})</TabsTrigger>
          <TabsTrigger value="all">All Achievements ({allAchievements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="earned">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {earnedAchievements.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">You haven't earned any achievements yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Complete courses, take quizzes, and engage with the platform to earn achievements!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {earnedAchievements.map((achievement) => (
                    <AchievementBadge
                      key={achievement.id}
                      title={achievement.title}
                      description={achievement.description}
                      category={achievement.category}
                      points={achievement.points}
                      rarity={achievement.rarity}
                      earnedAt={achievement.earnedAt}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3 text-lg">Earned Achievements</h3>
                  {earnedAchievements.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {earnedAchievements.map((achievement) => (
                        <AchievementBadge
                          key={achievement.id}
                          title={achievement.title}
                          description={achievement.description}
                          category={achievement.category}
                          points={achievement.points}
                          rarity={achievement.rarity}
                          earnedAt={achievement.earnedAt}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-6">No achievements earned yet.</p>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-3 text-lg">Available to Earn</h3>
                  {unearnedAchievements.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {unearnedAchievements.map((achievement) => (
                        <AchievementBadge
                          key={achievement.id}
                          title={achievement.title}
                          description={achievement.description}
                          category={achievement.category}
                          points={achievement.points}
                          rarity={achievement.rarity}
                          progress={achievement.category === "progress" ? 30 : undefined}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">You've earned all available achievements! 🎉</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
