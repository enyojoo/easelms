"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function CustomDomainSettings() {
  const [customDomain, setCustomDomain] = useState("")
  const [isVerified, setIsVerified] = useState(false)

  const handleVerifyDomain = () => {
    // In a real application, this would involve API calls to verify the domain
    console.log("Verifying domain:", customDomain)
    setIsVerified(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Domain Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customDomain">Custom Domain</Label>
            <Input
              id="customDomain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="Enter your custom domain (e.g., courses.yourbrand.com)"
            />
          </div>
          <Button onClick={handleVerifyDomain}>Verify Domain</Button>
          {isVerified && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Domain Verified</AlertTitle>
              <AlertDescription>Your custom domain has been successfully verified and is now active.</AlertDescription>
            </Alert>
          )}
          <div className="text-sm text-muted-foreground">
            <p>To set up your custom domain:</p>
            <ol className="list-decimal list-inside mt-2">
              <li>
                Add a CNAME record pointing to <code>cname.enthronement-university.com</code>
              </li>
              <li>Enter your custom domain above</li>
              <li>Click "Verify Domain"</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
