import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import ThemeToggle from "./ThemeToggle"
import { getServerAuthState } from "@/app/utils/server-auth"

interface HeaderProps {
  workspace: string
}

export default function Header({ workspace }: HeaderProps) {
  const { isLoggedIn, userType, user } = getServerAuthState()

  if (!isLoggedIn || !user) {
    return (
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href={`/${workspace}`} className="text-2xl font-bold">
              {workspace}
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link href={`/${workspace}/login`}>Login</Link>
            </Button>
          </div>
        </div>
      </header>
    )
  }

  const userTypePrefix = userType === "instructor" ? "in" : "le"

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-10 bg-background-element/80 backdrop-blur-md border-b border-border">
      <div className="px-6 py-3">
        <div className="flex items-center justify-end space-x-6">
          <nav className="hidden lg:flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <Image
                      src={user.profileImage || "/placeholder.svg"}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                      style={{ objectPosition: "center 20%" }}
                    />
                  </div>
                  <span className="font-medium">{user.name}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border border-border">
                <DropdownMenuItem className="py-3 cursor-pointer">
                  <Link href={`/${workspace}/${userTypePrefix}/profile`} className="w-full">
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="py-3 cursor-pointer">
                  <Link href={`/${workspace}/${userTypePrefix}/settings`} className="w-full">
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem className="py-3 cursor-pointer">
                  <Link href={`/logout`} className="w-full">
                    Log out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  )
}

