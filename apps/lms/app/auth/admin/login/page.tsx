"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { getUserByEmail } from "@/data/users"
import Logo from "@/components/Logo"
import { Copy, AlertCircle, Eye, EyeOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const DemoAccess = ({ setCredentials }: { setCredentials: (email: string, password: string) => void }) => (
  <div className="text-center mb-4 sm:mb-6 space-y-2">
    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Admin Demo Access:</p>
    <div className="space-y-1">
      <div className="flex items-center justify-center flex-wrap gap-2 px-2">
        <span className="text-xs sm:text-sm break-words">Admin: admin@example.com | password123</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-6 sm:w-6 flex-shrink-0"
          onClick={() => setCredentials("admin@example.com", "password123")}
        >
          <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  </div>
)

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const setCredentials = (newEmail: string, newPassword: string) => {
    setEmail(newEmail)
    setPassword(newPassword)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const user = getUserByEmail(email)
      if (user && user.userType === "admin" && password === "password123") {
        // In a real app, you would validate the password here
        // Set the authentication cookie with more user data
        const authData = {
          userType: user.userType,
          email: user.email,
          name: user.name,
          profileImage: user.profileImage,
          bio: user.bio,
        }
        document.cookie = `auth=${encodeURIComponent(JSON.stringify(authData))}; path=/; max-age=86400;`

        // Redirect to the admin dashboard
        router.push("/admin/dashboard")
      } else {
        setError("Invalid email or password. Admin access only.")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="flex justify-center items-center min-h-screen bg-background px-4 sm:px-6 py-6 sm:py-8">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        <div className="text-center">
          <Logo className="mx-auto mb-4 sm:mb-6 w-full max-w-[140px] sm:max-w-[180px]" />
          <DemoAccess setCredentials={setCredentials} />
        </div>
        <Card className="w-full">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl">Admin Login</CardTitle>
            <CardDescription className="text-sm sm:text-base">Enter your admin credentials to access the dashboard</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
              {error && (
                <Alert variant="destructive" className="text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="min-h-[44px] text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                  <Link href="/forgot-password" className="text-xs sm:text-sm hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10 min-h-[44px] text-sm sm:text-base"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent min-w-[44px]"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 sm:p-6 pt-0 flex flex-col space-y-3 sm:space-y-4">
              <Button type="submit" className="w-full min-h-[44px] text-sm sm:text-base" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
              <div className="text-center text-xs sm:text-sm">
                <Link href="/auth/learner/login" className="text-primary hover:underline">
                  Learner Login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

