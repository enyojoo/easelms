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
    certificateTitle?: string
    certificateDescription: string
    signatureImage?: string
    signatureName?: string
    signatureTitle?: string
    additionalText?: string
    certificateType: "completion" | "participation" | "achievement"
  }
  onUpdate: (settings: any) => void
  courseId?: string | number
}

export default function CourseCertificateSettings({ settings, onUpdate, courseId }: CourseCertificateSettingsProps) {
  // Track if "optional" is selected to show custom title field
  const isOptionalSelected = settings.certificateTitle !== undefined && settings.certificateTitle !== null && settings.certificateTitle !== ""
  const currentValue = isOptionalSelected ? "optional" : (settings.certificateType || "completion")

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
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Certificate Template (Optional)</Label>
                  <FileUpload
                    type="certificate-template"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    maxSize={5 * 1024 * 1024} // 5MB
                    multiple={false}
                    courseId={courseId}
                    initialValue={settings.certificateTemplate ? [settings.certificateTemplate] : undefined}
                    onUploadComplete={(files, urls) => {
                      if (urls.length > 0) {
                        onUpdate({ ...settings, certificateTemplate: urls[0] })
                      }
                    }}
                    onRemove={() => {
                      onUpdate({ ...settings, certificateTemplate: "" })
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload a custom certificate template/background image in <strong>landscape orientation</strong> (PNG, JPEG, or PDF, max 5MB). The template should be landscape format to match the certificate layout. If not provided, the default certificate design will be used.
                  </p>
                  {settings.certificateTemplate && (
                    <div className="mt-2">
                      <SafeImage
                        src={settings.certificateTemplate}
                        alt="Certificate Template Preview"
                        className="max-w-full h-auto rounded-md border"
                        style={{ maxHeight: "200px" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Certificate Type</Label>
              <Select
                value={currentValue}
                onValueChange={(value) => {
                  if (value === "optional") {
                    // When switching to optional, keep current type and show title input
                    onUpdate({ 
                      ...settings, 
                      certificateType: settings.certificateType || "completion",
                      certificateTitle: settings.certificateTitle || ""
                    })
                  } else {
                    // When selecting a type, clear custom title (set to undefined to hide input)
                    onUpdate({ 
                      ...settings, 
                      certificateType: value as "completion" | "participation" | "achievement",
                      certificateTitle: undefined
                    })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completion">Completion</SelectItem>
                  <SelectItem value="participation">Participation</SelectItem>
                  <SelectItem value="achievement">Achievement</SelectItem>
                  <SelectItem value="optional">Custom Title (Optional)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                <strong>Completion:</strong> "Certificate of Completion" - "has successfully completed"<br />
                <strong>Participation:</strong> "Certificate of Participation" - "has successfully participated in"<br />
                <strong>Achievement:</strong> "Certificate of Achievement" - "has successfully achieved"<br />
                <strong>Custom Title:</strong> Enter your own certificate title
              </p>
            </div>

            {isOptionalSelected && (
              <div className="space-y-2">
                <Label>Custom Certificate Title</Label>
                <Input
                  placeholder="e.g., Certificate of Excellence"
                  value={settings.certificateTitle || ""}
                  onChange={(e) => {
                    const newTitle = e.target.value
                    onUpdate({ 
                      ...settings, 
                      certificateTitle: newTitle,
                      certificateType: settings.certificateType || "completion"
                    })
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Enter a custom title for the certificate. This will override the default title.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Certificate Description</Label>
            <Textarea
              placeholder={
                settings.certificateType === "completion"
                  ? "e.g., This is to certify that [student_name] has successfully completed the course..."
                  : settings.certificateType === "participation"
                  ? "e.g., This is to certify that [student_name] has successfully participated in the course..."
                  : settings.certificateType === "achievement"
                  ? "e.g., This is to certify that [student_name] has successfully achieved excellence in the course..."
                  : "e.g., This is to certify that [student_name] has successfully completed the course..."
              }
              value={settings.certificateDescription}
              onChange={(e) => onUpdate({ ...settings, certificateDescription: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Use <strong>[student_name]</strong> as a placeholder for the student's name (from their profile).<br />
              <strong>Examples by type:</strong><br />
              • <strong>Completion:</strong> "This is to certify that [student_name] has successfully completed the course..."<br />
              • <strong>Participation:</strong> "This is to certify that [student_name] has successfully participated in the course..."<br />
              • <strong>Achievement:</strong> "This is to certify that [student_name] has successfully achieved excellence in the course..."
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload Signature Image</Label>
                  <FileUpload
                    type="signature"
                    accept="image/png,image/jpeg,image/jpg"
                    maxSize={1 * 1024 * 1024} // 1MB
                    multiple={false}
                    courseId={courseId}
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
                  <Label>Name of Signer</Label>
                  <Input
                    placeholder="e.g., John Doe"
                    value={settings.signatureName || ""}
                    onChange={(e) => onUpdate({ ...settings, signatureName: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    The name of the person signing the certificate
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Title of Signer</Label>
                  <Input
                    placeholder="e.g., Course Instructor, Director of Education"
                    value={settings.signatureTitle || ""}
                    onChange={(e) => onUpdate({ ...settings, signatureTitle: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    The title or position of the signer (e.g., Course Instructor, Director)
                  </p>
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
