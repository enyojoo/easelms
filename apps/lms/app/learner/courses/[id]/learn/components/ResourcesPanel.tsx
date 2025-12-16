import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Link, Download } from "lucide-react"

interface ResourcesPanelProps {
  resources: {
    type: "document" | "link"
    title: string
    url: string
  }[]
}

export default function ResourcesPanel({ resources }: ResourcesPanelProps) {
  if (!resources || resources.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Lesson Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No resources available for this lesson.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Lesson Resources</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {resources.map((resource, index) => (
            <li key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg">
              <span className="flex items-center text-text-primary mb-2 sm:mb-0">
                {resource.type === "document" ? (
                  <FileText className="mr-2 h-4 w-4 text-blue-400 flex-shrink-0" />
                ) : (
                  <Link className="mr-2 h-4 w-4 text-green-400 flex-shrink-0" />
                )}
                <span className="truncate">{resource.title}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-input hover:bg-accent hover:text-accent-foreground w-full sm:w-auto mt-2 sm:mt-0"
              >
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  {resource.type === "document" ? (
                    <>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </>
                  ) : (
                    <>Open</>
                  )}
                </a>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
