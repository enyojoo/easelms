"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
            <Label>Shuffle Questions</Label>
            <p className="text-sm text-muted-foreground">Randomize question order for each student</p>
          </div>
          <Switch
            checked={quiz.shuffleQuestions || false}
            onCheckedChange={(checked) => updateSetting("shuffleQuestions", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Shuffle Answers</Label>
            <p className="text-sm text-muted-foreground">Randomize answer option order for multiple choice questions</p>
          </div>
          <Switch
            checked={quiz.shuffleAnswers || false}
            onCheckedChange={(checked) => updateSetting("shuffleAnswers", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Show Results Immediately</Label>
            <p className="text-sm text-muted-foreground">Show score and feedback right after submission</p>
          </div>
          <Switch
            checked={quiz.showResultsImmediately || false}
            onCheckedChange={(checked) => updateSetting("showResultsImmediately", checked)}
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

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Show Correct Answers</Label>
            <p className="text-sm text-muted-foreground">Display correct answers after quiz completion</p>
          </div>
          <Switch
            checked={quiz.showCorrectAnswers || false}
            onCheckedChange={(checked) => updateSetting("showCorrectAnswers", checked)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

