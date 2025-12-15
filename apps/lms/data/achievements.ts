export interface Achievement {
  id: string
  title: string
  description: string
  icon?: string
  category: "completion" | "progress" | "quiz" | "engagement" | "milestone"
  points: number
  rarity: "common" | "rare" | "epic" | "legendary"
}

export interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  earnedAt: Date
  progress?: number // for progress-based achievements
}

export const achievements: Achievement[] = [
  {
    id: "1",
    title: "First Login",
    description: "Welcome! You've logged in for the first time",
    category: "engagement",
    points: 10,
    rarity: "common",
  },
  {
    id: "2",
    title: "Course Started",
    description: "You've started your first course",
    category: "progress",
    points: 25,
    rarity: "common",
  },
  {
    id: "3",
    title: "Quiz Master",
    description: "Scored 100% on a quiz",
    category: "quiz",
    points: 50,
    rarity: "rare",
  },
  {
    id: "4",
    title: "Course Completed",
    description: "Completed your first course",
    category: "completion",
    points: 100,
    rarity: "epic",
  },
  {
    id: "5",
    title: "Perfect Score",
    description: "Scored 100% on all quizzes in a course",
    category: "quiz",
    points: 200,
    rarity: "legendary",
  },
  {
    id: "6",
    title: "Fast Learner",
    description: "Completed a course in less than 24 hours",
    category: "milestone",
    points: 150,
    rarity: "epic",
  },
]

export const userAchievements: UserAchievement[] = [
  {
    id: "1",
    userId: "1",
    achievementId: "1",
    earnedAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    userId: "1",
    achievementId: "2",
    earnedAt: new Date("2024-01-15"),
  },
  {
    id: "3",
    userId: "2",
    achievementId: "1",
    earnedAt: new Date("2024-01-01"),
  },
  {
    id: "4",
    userId: "2",
    achievementId: "4",
    earnedAt: new Date("2024-01-25"),
  },
]

export function getAchievementsByUser(userId: string): (Achievement & { earnedAt: Date })[] {
  return userAchievements
    .filter((ua) => ua.userId === userId)
    .map((ua) => {
      const achievement = achievements.find((a) => a.id === ua.achievementId)
      if (!achievement) throw new Error(`Achievement ${ua.achievementId} not found`)
      return { ...achievement, earnedAt: ua.earnedAt }
    })
}

export function getAchievementById(id: string): Achievement | undefined {
  return achievements.find((a) => a.id === id)
}

