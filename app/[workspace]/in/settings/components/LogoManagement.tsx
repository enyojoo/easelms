import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"
import Image from "next/image"

export default function LogoManagement() {
  const [logo, setLogo] = useState<string | null>(null)

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogo(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Upload Logo</Label>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => document.getElementById("logo")?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Choose File
              </Button>
              <input id="logo" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              {logo && <span className="text-sm text-muted-foreground">Logo uploaded</span>}
            </div>
          </div>
          {logo && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Preview:</h3>
              <div className="w-40 h-40 relative">
                <Image src={logo} alt="Uploaded logo" layout="fill" objectFit="contain" />
              </div>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            <p>Logo requirements:</p>
            <ul className="list-disc list-inside mt-2">
              <li>File format: PNG or SVG</li>
              <li>Maximum file size: 2MB</li>
              <li>Recommended dimensions: 200x200 pixels</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

