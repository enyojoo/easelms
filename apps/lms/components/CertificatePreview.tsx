"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, Award } from "lucide-react"

interface CertificatePreviewProps {
  courseTitle: string
  learnerName: string
  completionDate: string
  certificateId?: string
  onDownload?: () => void
  className?: string
}

export default function CertificatePreview({
  courseTitle,
  learnerName,
  completionDate,
  certificateId,
  onDownload,
  className,
}: CertificatePreviewProps) {
  const handleDownload = () => {
    // In real app, this would generate and download the certificate PDF
    if (onDownload) {
      onDownload()
    } else {
      // Mock download
      console.log("Downloading certificate...", { courseTitle, learnerName, completionDate, certificateId })
    }
  }

  return (
    <div className={className}>
      <Card className="border-2 border-primary">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            {/* Certificate Header */}
            <div className="space-y-2">
              <Award className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-3xl font-bold">Certificate of Completion</h2>
            </div>

            {/* Certificate Body */}
            <div className="space-y-4 py-6 border-y-2 border-primary/20 w-full">
              <p className="text-lg text-muted-foreground">This is to certify that</p>
              <h3 className="text-2xl font-bold">{learnerName}</h3>
              <p className="text-lg text-muted-foreground">
                has successfully completed the course
              </p>
              <h4 className="text-xl font-semibold text-primary">{courseTitle}</h4>
            </div>

            {/* Certificate Footer */}
            <div className="space-y-4 w-full">
              <div className="flex justify-between text-sm text-muted-foreground">
                <div>
                  <p>Date of Completion</p>
                  <p className="font-semibold text-foreground">{completionDate}</p>
                </div>
                {certificateId && (
                  <div>
                    <p>Certificate ID</p>
                    <p className="font-semibold text-foreground">{certificateId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Download Button */}
            <Button onClick={handleDownload} className="mt-4">
              <Download className="mr-2 h-4 w-4" />
              Download Certificate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

