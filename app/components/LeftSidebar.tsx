"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Home,
  BookOpen,
  Award,
  HelpCircle,
  Users,
  BarChart,
  User,
  Settings,
  LogOut,
} from "lucide-react"
import Logo from "./Logo"
import { ThemeToggle } from "./ThemeToggle"
import { logout } from "../utils/logout"

interface LeftSidebarProps {
  userType: "user" | "admin"
}

export default function LeftSidebar({ userType }: LeftSidebarProps) {
  const pathname = usePathname()

  const menuItems = {
    user: [
      { href: "/user/dashboard", icon: Home, label: "Dashboard" },
      { href: "/user/courses", icon: BookOpen, label: "Courses" },
      { href: "/user/achievements", icon: Award, label: "Achievements" },
      { href: "https://t.me/enyosam", icon: HelpCircle, label: "Support", external: true },
    ],
    admin: [
      { href: "/admin/dashboard", icon: Home, label: "Dashboard" },
      { href: "/admin/courses", icon: BookOpen, label: "Courses" },
      { href: "/admin/reports", icon: BarChart, label: "Report" },
      { href: "https://t.me/enyosam", icon: HelpCircle, label: "Support", external: true },
    ],
  }

  const bottomMenuItems = {
    user: [
      { href: "/user/profile", icon: User, label: "Profile" },
      { href: "/user/settings", icon: Settings, label: "Settings" },
      { href: "#", icon: LogOut, label: "Log Out", isLogout: true },
    ],
    admin: [
      { href: "/admin/profile", icon: User, label: "Profile" },
      { href: "/admin/settings", icon: Settings, label: "Settings" },
      { href: "#", icon: LogOut, label: "Log Out", isLogout: true },
    ],
  }

  const currentMenu = menuItems[userType]
  const currentBottomMenu = bottomMenuItems[userType]

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
      <div className="mt-auto px-2 border-t border-border pt-4">
        {currentBottomMenu.map((item) => {
          const isActive = pathname === item.href
          if (item.isLogout) {
            return (
              <Button
                key={item.href}
                variant="ghost"
                onClick={() => logout(userType)}
                className="w-full justify-start mb-2 text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            )
          }
          return (
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
        <div className="mt-4 flex justify-center mb-5">
          <ThemeToggle />
        </div>
        <div className="p-2 text-xs text-muted-foreground text-center">© 2025 EaseLMS. All rights reserved.</div>
      </div>
    </div>
  )
}
