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
          <p className="text-center text-muted-foreground py-8">No resources available for this lesson.</p>
    )
  }

  return (
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
          <a 
            href={resource.url} 
            {...(resource.type === "link" ? { target: "_blank", rel: "noopener noreferrer" } : { download: resource.title || "download"})}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-full sm:w-auto mt-2 sm:mt-0"
          >
                  {resource.type === "document" ? (
                    <>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </>
                  ) : (
                    <>Open</>
                  )}
                </a>
            </li>
          ))}
        </ul>
  )
}
