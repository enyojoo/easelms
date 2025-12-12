import { ScrollArea } from "@/components/ui/scroll-area"

interface LessonContentProps {
  content: string
}

export default function LessonContent({ content }: LessonContentProps) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="prose prose-invert max-w-none">{content}</div>
    </ScrollArea>
  )
}
