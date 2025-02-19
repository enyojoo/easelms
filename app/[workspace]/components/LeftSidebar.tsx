"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getClientAuthState } from "@/app/utils/client-auth"
import { BarChart, BookOpen, Calendar, MessageSquare, Zap, FileText, Video, Trophy } from "lucide-react"
import Logo from "@/app/components/Logo"

export function LeftSidebar() {
  const pathname = usePathname()
  const { isLoggedIn, userType } = getClientAuthState()
  const workspace = pathname.split("/")[1]

  const instructorNavItems = [
    {
      name: "Dashboard",
      href: `/${workspace}/in/dash`,
      icon: BarChart,
    },
    {
      name: "Courses",
      href: `/${workspace}/in/courses`,
      icon: BookOpen,
    },
    {
      name: "Workshops",
      href: `/${workspace}/in/workshops`,
      icon: Calendar,
    },
    {
      name: "Messages",
      href: `/${workspace}/in/messages`,
      icon: MessageSquare,
    },
    {
      name: "Spark",
      href: `/${workspace}/in/spark`,
      icon: Zap,
    },
    {
      name: "Report",
      href: `/${workspace}/in/report`,
      icon: FileText,
    },
  ]

  const learnerNavItems = [
    {
      name: "Dashboard",
      href: `/${workspace}/le/dash`,
      icon: BarChart,
    },
    {
      name: "Courses",
      href: `/${workspace}/le/courses`,
      icon: BookOpen,
    },
    {
      name: "Workshops",
      href: `/${workspace}/le/workshops`,
      icon: Calendar,
    },
    {
      name: "Messages",
      href: `/${workspace}/le/messages`,
      icon: MessageSquare,
    },
    {
      name: "Studio",
      href: `/${workspace}/le/studio`,
      icon: Video,
    },
    {
      name: "Achievements",
      href: `/${workspace}/le/achievements`,
      icon: Trophy,
    },
  ]

  const navItems = userType === "instructor" ? instructorNavItems : learnerNavItems

  if (!isLoggedIn) return null

  return (
    <aside className="bg-muted w-64 h-screen overflow-y-auto flex-shrink-0">
      <div className="p-4">
        <Logo className="mb-6" />
      </div>
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.name}
            asChild
            variant="ghost"
            className={cn("w-full justify-start", pathname === item.href && "bg-muted-foreground/20")}
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.name}
            </Link>
          </Button>
        ))}
      </nav>
    </aside>
  )
}

