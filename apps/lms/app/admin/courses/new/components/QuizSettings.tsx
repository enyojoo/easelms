"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Quiz } from "../types/quiz"

interface QuizSettingsProps {
  quiz: Quiz
  onChange: (quiz: Quiz) => void
}

export default function QuizSettings({ quiz, onChange }: QuizSettingsProps) {
  const updateSetting = (key: keyof Quiz, value: any) => {
    onChange({ ...quiz, [key]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quiz Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Show Correct Answers</Label>
            <p className="text-sm text-muted-foreground">Reveal correct answers after quiz completion</p>
          </div>
          <Switch
            checked={quiz.showCorrectAnswers || false}
            onCheckedChange={(checked) => updateSetting("showCorrectAnswers", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Allow Multiple Attempts</Label>
            <p className="text-sm text-muted-foreground">Let students retake the quiz</p>
          </div>
          <Switch
            checked={quiz.allowMultipleAttempts || false}
            onCheckedChange={(checked) => updateSetting("allowMultipleAttempts", checked)}
          />
        </div>

        {quiz.allowMultipleAttempts && (
          <div className="space-y-2 pl-4 border-l-2 border-primary">
            <Label htmlFor="max-attempts">Maximum Number of Attempts</Label>
            <Input
              id="max-attempts"
              type="number"
              min="1"
              max="100"
              value={quiz.maxAttempts ?? 3}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : 3
                updateSetting("maxAttempts", value)
              }}
              placeholder="3"
            />
            <p className="text-xs text-muted-foreground">How many times students can attempt this quiz</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

