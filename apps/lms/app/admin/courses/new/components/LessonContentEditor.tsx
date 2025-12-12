"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"

interface LessonContentEditorProps {
  type: "video" | "text"
  content: any
  onChange: (content: any) => void
}

export default function LessonContentEditor({ type, content, onChange }: LessonContentEditorProps) {
  const handleVideoSettingsChange = (key: string, value: boolean) => {
    onChange({
      ...content,
      settings: {
        ...content.settings,
        [key]: value,
      },
    })
  }

  if (type === "video") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="videoUrl">Video URL</Label>
          <Input
            id="videoUrl"
            placeholder="Enter video URL or embed code"
            value={content.url || ""}
            onChange={(e) => onChange({ ...content, url: e.target.value })}
          />
        </div>

        <Card className="p-4">
          <h4 className="font-medium mb-4">Video Settings</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autostart</Label>
                <p className="text-sm text-muted-foreground">Start video automatically when lesson loads</p>
              </div>
              <Switch
                checked={content.settings?.autostart || false}
                onCheckedChange={(checked) => handleVideoSettingsChange("autostart", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Controls</Label>
                <p className="text-sm text-muted-foreground">Display video player controls</p>
              </div>
              <Switch
                checked={content.settings?.showControls || false}
                onCheckedChange={(checked) => handleVideoSettingsChange("showControls", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Pause on Unfocus</Label>
                <p className="text-sm text-muted-foreground">Pause video when window loses focus</p>
              </div>
              <Switch
                checked={content.settings?.pauseOnUnfocus || false}
                onCheckedChange={(checked) => handleVideoSettingsChange("pauseOnUnfocus", checked)}
              />
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (type === "text") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lessonContent">Lesson Content</Label>
          <Textarea
            id="lessonContent"
            placeholder="Enter lesson content..."
            value={content.text || ""}
            onChange={(e) => onChange({ ...content, text: e.target.value })}
            rows={10}
          />
        </div>
      </div>
    )
  }

  return null
}
