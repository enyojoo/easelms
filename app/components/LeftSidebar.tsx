"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Home,
  BookOpen,
  Calendar,
  Award,
  MessageSquare,
  HelpCircle,
  Users,
  BarChart,
  Sparkles,
  Laptop,
} from "lucide-react"
import Logo from "./Logo"
import { ThemeToggle } from "./ThemeToggle"

interface LeftSidebarProps {
  userType: "learner" | "instructor" | "admin"
}

export default function LeftSidebar({ userType }: LeftSidebarProps) {
  const pathname = usePathname()

  const menuItems = {
    learner: [
      { href: "/dash", icon: Home, label: "Dashboard" },
      { href: "/studio", icon: Laptop, label: "Sessions" },
      { href: "/courses", icon: BookOpen, label: "Courses" },
      { href: "/workshops", icon: Calendar, label: "Workshops" },
      { href: "/achievements", icon: Award, label: "Achievements" },
      { href: "/messages", icon: MessageSquare, label: "Messages" },
      { href: "https://t.me/enyosam", icon: HelpCircle, label: "Support", external: true },
    ],
    instructor: [
      { href: "/dash", icon: Home, label: "Dashboard" },
      { href: "/manage-courses", icon: BookOpen, label: "Manage Courses" },
      { href: "/plan-workshops", icon: Calendar, label: "Plan Workshops" },
      { href: "/spark", icon: Sparkles, label: "SparkAI" },
      { href: "/in-messages", icon: MessageSquare, label: "Messages" },
      { href: "/in-report", icon: BarChart, label: "Report" },
      { href: "https://t.me/enyosam", icon: HelpCircle, label: "Support", external: true },
    ],
    admin: [
      { href: "/dash", icon: Home, label: "Dashboard" },
      { href: "/ad-users", icon: Users, label: "Manage Users" },
      { href: "/ad-courses", icon: BookOpen, label: "Manage Courses" },
      { href: "/ad-workshops", icon: Calendar, label: "Manage Workshops" },
      { href: "/ad-messages", icon: MessageSquare, label: "Messages" },
      { href: "/report", icon: BarChart, label: "Report" },
    ],
  }

  const currentMenu = menuItems[userType]

  return (
    <div className="w-64 h-screen py-4 flex flex-col fixed left-0 top-0 bg-background-element border-r border-border hidden lg:flex">
      <div className="mb-8 px-6">
        <Logo className="w-24" />
      </div>
      <nav className="flex-grow px-2">
        {currentMenu.map((item) => {
          const isActive = pathname === item.href
          return item.external ? (
            <a href={item.href} key={item.href} target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                className={`w-full justify-start mb-2 ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <item.icon className={`mr-2 h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </Button>
            </a>
          ) : (
            <Link href={item.href} key={item.href}>
              <Button
                variant="ghost"
                className={`w-full justify-start mb-2 ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <item.icon className={`mr-2 h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto">
        <div className="mt-auto flex justify-center mb-5">
          <ThemeToggle />
        </div>
        <div className="p-2 text-xs text-muted-foreground text-center">© 2025 Easner, Inc. All rights reserved.</div>
      </div>
    </div>
  )
}
