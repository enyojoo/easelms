import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function EmailLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <CardTitle className="text-2xl">Log in with email</CardTitle>
          <CardDescription>Enter your email address to receive a secure login link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" placeholder="name@example.com" />
          </div>
          <Button className="w-full">Send Secure Link</Button>
        </CardContent>
      </Card>
    </div>
  )
}

