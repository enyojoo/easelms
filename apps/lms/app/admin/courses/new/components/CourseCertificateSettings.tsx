"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import SafeImage from "@/components/SafeImage"
import FileUpload from "@/components/FileUpload"

interface CourseCertificateSettingsProps {
  settings: {
    certificateEnabled: boolean
    certificateTemplate: string
    certificateDescription: string
    signatureImage?: string
    signatureTitle?: string
    additionalText?: string
    certificateType: "completion" | "participation"
  }
  onUpdate: (settings: any) => void
}

export default function CourseCertificateSettings({ settings, onUpdate }: CourseCertificateSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enable Certificate</Label>
          <p className="text-sm text-muted-foreground">Issue certificates to students upon course completion</p>
        </div>
        <Switch
          checked={settings.certificateEnabled}
          onCheckedChange={(checked) => onUpdate({ ...settings, certificateEnabled: checked })}
        />
      </div>

      {settings.certificateEnabled && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Certificate Description</Label>
            <Textarea
              placeholder="e.g., This is to certify that [student_name] has successfully completed the course..."
              value={settings.certificateDescription}
              onChange={(e) => onUpdate({ ...settings, certificateDescription: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">Use [student_name] as a placeholder for the student's name</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload Signature Image</Label>
                  <FileUpload
                    type="thumbnail"
                    accept="image/png,image/jpeg,image/jpg"
                    maxSize={1 * 1024 * 1024} // 1MB
                    multiple={false}
                    initialValue={settings.signatureImage ? [settings.signatureImage] : undefined}
                    onUploadComplete={(files, urls) => {
                      if (urls.length > 0) {
                        onUpdate({ ...settings, signatureImage: urls[0] })
                      }
                    }}
                    onRemove={() => {
                      onUpdate({ ...settings, signatureImage: "" })
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload an image of your signature (PNG or JPEG, max 1MB). Will be embedded in the certificate.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Signature Title</Label>
                  <Input
                    placeholder="e.g., Course Instructor"
                    value={settings.signatureTitle}
                    onChange={(e) => onUpdate({ ...settings, signatureTitle: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Additional Text</Label>
            <Textarea
              placeholder="Any additional text to appear on the certificate..."
              value={settings.additionalText}
              onChange={(e) => onUpdate({ ...settings, additionalText: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">This will appear at the bottom of the certificate</p>
          </div>
        </div>
      )}
    </div>
  )
}
