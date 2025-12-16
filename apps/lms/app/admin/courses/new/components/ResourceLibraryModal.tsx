"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, X, FileUp, Link as LinkIcon } from "lucide-react"
import { useResourceLibrary } from "../hooks/useResourceLibrary"
import { Resource } from "./ResourceManager"

interface ResourceLibraryModalProps {
  open: boolean
  onClose: () => void
  onSelect: (resource: Resource) => void
}

export default function ResourceLibraryModal({ open, onClose, onSelect }: ResourceLibraryModalProps) {
  const { resources, deleteResource, getResources, getCategories } = useResourceLibrary()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")

  const categories = getCategories()

  const filteredResources = useMemo(() => {
    return getResources({
      category: selectedCategory === "all" ? undefined : selectedCategory,
      type: selectedType === "all" ? undefined : selectedType as "document" | "link",
      search: search || undefined,
    })
  }, [resources, selectedCategory, selectedType, search, getResources])

  const handleSelect = (resource: Resource) => {
    const newResource: Resource = {
      ...resource,
      id: `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // New ID
    }
    onSelect(newResource)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Resource Library</DialogTitle>
          <DialogDescription>
            Browse and reuse resources from your library
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filters */}
          <div className="space-y-3 border-b pb-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resource List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredResources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No resources found</p>
                <p className="text-sm mt-1">Try adjusting your filters or add resources to the library</p>
              </div>
            ) : (
              filteredResources.map((resource) => (
                <Card
                  key={resource.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSelect(resource)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {resource.type === "document" ? (
                            <FileUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <LinkIcon className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Badge variant="secondary">{resource.type}</Badge>
                          {resource.category && (
                            <Badge variant="outline">{resource.category}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{resource.title}</p>
                        {resource.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 truncate">{resource.url}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteResource(resource.id)
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

