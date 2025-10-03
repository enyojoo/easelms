"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star } from "lucide-react"

interface AchievementsPanelProps {
  courseId: number
  progress: number
}

export default function AchievementsPanel({ courseId, progress }: AchievementsPanelProps) {
  const [achievements, setAchievements] = useState<string[]>([])

  useEffect(() => {
    // This is where you would normally fetch achievements from an API
    // For now, we'll simulate achievements based on progress
    const newAchievements = []
    if (progress >= 25) newAchievements.push("First Steps")
    if (progress >= 50) newAchievements.push("Halfway There")
    if (progress >= 75) newAchievements.push("Almost Done")
    if (progress === 100) newAchievements.push("Course Completed")
    setAchievements(newAchievements)
  }, [progress])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="mr-2 h-5 w-5" /> Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Course Progress</h3>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-1">{progress.toFixed(0)}% Complete</p>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Unlocked Achievements</h3>
            <ul className="space-y-2">
              {achievements.map((achievement, index) => (
                <li key={index} className="flex items-center">
                  <Star className="mr-2 h-4 w-4 text-yellow-500" />
                  <span>{achievement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
