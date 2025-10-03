"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  BookOpen,
  Calendar,
  MessageSquare,
  BarChart,
  Users,
  User,
  Award,
  HelpCircle,
  Settings,
  LogOut,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "./ThemeToggle"
import Logo from "./Logo"

interface MobileMenuProps {
  userType: "learner" | "instructor" | "admin"
  user: {
    name: string
    profileImage: string
  }
}

export default function MobileMenu({ userType, user }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const menuItems = {
    learner: [
      { href: "/dash", icon: Home, label: "Dashboard" },
      { href: "/courses", icon: BookOpen, label: "Courses" },
      { href: "/workshops", icon: Calendar, label: "Workshops" },
      { href: "/messages", icon: MessageSquare, label: "Messages" },
    ],
    instructor: [
      { href: "/dash", icon: Home, label: "Dashboard" },
      { href: "/manage-courses", icon: BookOpen, label: "Manage Courses" },
      { href: "/plan-workshops", icon: Calendar, label: "Plan Workshops" },
      { href: "/in-messages", icon: MessageSquare, label: "Messages" },
    ],
    admin: [
      { href: "/dash", icon: Home, label: "Dashboard" },
      { href: "/manage-courses", icon: BookOpen, label: "Manage Courses" },
      { href: "/manage-workshops", icon: Calendar, label: "Manage Workshops" },
      { href: "/manage-users", icon: Users, label: "Manage Users" },
    ],
  }

  const sidebarItems = {
    learner: [
      { href: "/profile", label: "Profile", icon: User },
      { href: "/achievements", label: "Achievements", icon: Award },
      { href: "https://t.me/enyosam", label: "Support", icon: HelpCircle, external: true },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/logout", label: "Log Out", icon: LogOut },
    ],
    instructor: [
      { href: "/in-profile", label: "Profile", icon: User },
      { href: "/report", label: "Report", icon: BarChart },
      { href: "/in-report", label: "Report", icon: BarChart },
      { href: "/in-settings", label: "Settings", icon: Settings },
      { href: "/logout", label: "Log Out", icon: LogOut },
    ],
    admin: [
      { href: "/profile", label: "Profile", icon: User },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/report", label: "Report", icon: BarChart },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/logout", label: "Log Out", icon: LogOut },
    ],
  }

  const currentMenu = menuItems[userType]
  const currentSidebar = sidebarItems[userType]

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md h-16 px-4 flex items-center justify-between md:px-6 border-b border-border">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden bg-transparent">
              <Avatar className="w-10 h-10 overflow-hidden">
                <AvatarImage src={user.profileImage} alt={user.name} className="object-cover" />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] sm:w-[300px] p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 overflow-hidden">
                    <AvatarImage src={user.profileImage} alt={user.name} className="object-cover" />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">{user.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{userType}</p>
                  </div>
                </div>
              </div>
              <nav className="flex-grow px-4 py-6">
                {currentSidebar.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center py-3 px-4 rounded-lg text-base font-medium ${
                      pathname === item.href
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                    onClick={() => setIsOpen(false)}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {item.icon && (
                      <item.icon className={`w-5 h-5 mr-3 ${pathname === item.href ? "text-primary" : ""}`} />
                    )}
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto p-4">
                <ThemeToggle disableTooltip />
              </div>
              <div className="p-4 text-left text-xs text-muted-foreground">
                © 2025 Easner, Inc. All rights reserved.
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex-1 flex justify-end">
          <Logo className="w-28" />
        </div>
      </header>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md h-16 px-4 flex items-center justify-around lg:hidden border-t border-border">
        {currentMenu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-center w-16 h-16 ${
              pathname === item.href ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className={`w-6 h-6 ${pathname === item.href ? "text-primary" : ""}`} />
          </Link>
        ))}
      </nav>
    </>
  )
}
