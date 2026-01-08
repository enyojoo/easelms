"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  // Only consider "optional" selected if certificateTitle is a non-empty string
  // If certificateTitle is undefined or empty string, use the certificateType
  const isOptionalSelected = settings.certificateTitle !== undefined && settings.certificateTitle.trim() !== ""
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
              <RadioGroup
                value={currentValue}
                onValueChange={(value) => {
                  if (value === "optional") {
                    // When switching to optional, keep current type and set certificateTitle to empty string to indicate optional mode
                    onUpdate({ 
                      ...settings, 
                      certificateType: settings.certificateType || "completion",
                      certificateTitle: settings.certificateTitle !== undefined ? settings.certificateTitle : ""
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
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="completion" id="cert-completion" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="cert-completion">Completion</Label>
                    <p className="text-sm text-muted-foreground">
                      "Certificate of Completion" - "has successfully completed"
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="participation" id="cert-participation" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="cert-participation">Participation</Label>
                    <p className="text-sm text-muted-foreground">
                      "Certificate of Participation" - "has successfully participated in"
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="achievement" id="cert-achievement" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="cert-achievement">Achievement</Label>
                    <p className="text-sm text-muted-foreground">
                      "Certificate of Achievement" - "has successfully achieved"
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="optional" id="cert-optional" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="cert-optional">Custom Title (Optional)</Label>
                    <p className="text-sm text-muted-foreground">
                      Enter your own certificate title
                    </p>
                  </div>
                </div>
              </RadioGroup>
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
                  ? "e.g., This certifies that [Student Name] has successfully completed the [Course Name], demonstrating commitment to personal growth and self-awareness."
                  : settings.certificateType === "participation"
                  ? "e.g., This certifies that [Student Name] has successfully participated in the [Course Name], demonstrating commitment to personal growth and self-awareness."
                  : settings.certificateType === "achievement"
                  ? "e.g., This certifies that [Student Name] has successfully achieved excellence in the [Course Name], demonstrating commitment to personal growth and self-awareness."
                  : "e.g., This certifies that [Student Name] has successfully completed the [Course Name], demonstrating commitment to personal growth and self-awareness."
              }
              value={settings.certificateDescription}
              onChange={(e) => onUpdate({ ...settings, certificateDescription: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              Use placeholders for dynamic content. Both placeholders will be rendered in <strong>24pt Bold</strong>.<br />
              <strong>Supported placeholders:</strong><br />
              • <code>[Student Name]</code> or <code>[student_name]</code> - Student's name from their profile<br />
              • <code>[Course Name]</code> or <code>[course_name]</code> - Course title<br />
              <strong>Supported formats:</strong> <code>[student_name]</code>, <code>[Student Name]</code>, <code>[course_name]</code>, <code>[Course Name]</code>, etc.<br />
              <strong>Example:</strong> "This certifies that [Student Name] has successfully completed the [Course Name], demonstrating commitment to personal growth and self-awareness."
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
