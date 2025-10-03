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
import type { UserType } from "../data/users"

interface HeaderProps {
  isLoggedIn: boolean
  userType?: UserType
  user?: {
    name: string
    profileImage: string
  }
}

export default function Header({ isLoggedIn, userType, user }: HeaderProps) {
  if (!isLoggedIn || !user) {
    return null
  }

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
                      src={user.profileImage}
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
                {userType === "learner" ? (
                  <>
                    <DropdownMenuItem className="py-3 cursor-pointer">
                      <Link href="/profile" className="w-full">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="py-3 cursor-pointer">
                      <Link href="/settings" className="w-full">
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem className="py-3 cursor-pointer">
                      <Link href="/in-profile" className="w-full">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="py-3 cursor-pointer">
                      <Link href="/in-settings" className="w-full">
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem className="py-3 cursor-pointer">
                  <Link href="/logout" className="w-full">
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
