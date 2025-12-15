"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Trophy, Star, Zap, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

interface AchievementBadgeProps {
  title: string
  description: string
  category: "completion" | "progress" | "quiz" | "engagement" | "milestone"
  points: number
  rarity: "common" | "rare" | "epic" | "legendary"
  earnedAt?: Date
  progress?: number // 0-100 for progress-based achievements
  className?: string
}

const rarityColors = {
  common: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600",
  rare: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-600",
  epic: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-600",
  legendary: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-600",
}

const categoryIcons = {
  completion: Award,
  progress: Target,
  quiz: Star,
  engagement: Zap,
  milestone: Trophy,
}

export default function AchievementBadge({
  title,
  description,
  category,
  points,
  rarity,
  earnedAt,
  progress,
  className,
}: AchievementBadgeProps) {
  const Icon = categoryIcons[category]
  const isEarned = earnedAt !== undefined
  const progressValue = progress !== undefined ? progress : isEarned ? 100 : 0

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card
          className={cn(
            "cursor-pointer hover:shadow-lg transition-all duration-200",
            !isEarned && "opacity-60",
            className
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0",
                  rarityColors[rarity]
                )}
              >
                <Icon className={cn("h-8 w-8", isEarned ? "text-current" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={cn("font-semibold", isEarned ? "text-foreground" : "text-muted-foreground")}>
                    {title}
                  </h3>
                  <Badge variant="outline" className={cn("text-xs", rarityColors[rarity])}>
                    {rarity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{description}</p>
                {!isEarned && progress !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                )}
                {isEarned && earnedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Earned {earnedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold text-primary">{points} points</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", rarityColors[rarity])}>
              <Icon className="h-6 w-6" />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">Points</span>
            <span className="text-lg font-bold text-primary">{points}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">Rarity</span>
            <Badge variant="outline" className={rarityColors[rarity]}>
              {rarity}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">Category</span>
            <span className="text-sm capitalize">{category}</span>
          </div>
          {isEarned && earnedAt && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">Earned On</span>
              <span className="text-sm">
                {earnedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          )}
          {!isEarned && progress !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

