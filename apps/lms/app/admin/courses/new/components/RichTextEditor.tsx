"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { createLowlight } from "lowlight"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  Code,
  Quote,
  Undo,
  Redo,
} from "lucide-react"
import { useState, useEffect } from "react"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export default function RichTextEditor({ content, onChange, placeholder = "Start typing..." }: RichTextEditorProps) {
  const [isEmpty, setIsEmpty] = useState(true)
  const [updateCount, setUpdateCount] = useState(0)
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: true,
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: {
          HTMLAttributes: {
            class: "border-l-4 border-primary pl-4 italic",
          },
        },
      }),
      CodeBlockLowlight.configure({
        lowlight: createLowlight(),
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
      setIsEmpty(editor.isEmpty)
      setUpdateCount(c => c + 1)
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4",
      },
    },
    onSelectionUpdate: ({ editor }) => {
      setIsEmpty(editor.isEmpty)
      setUpdateCount(c => c + 1)
    },
  })

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content)
      setIsEmpty(editor.isEmpty)
    }
  }, [editor, content])

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div key={updateCount} className="border-b p-2 flex flex-wrap gap-1 bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleBold().run()
          }}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-muted" : ""}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleItalic().run()
          }}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-muted" : ""}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleBlockquote().run()
          }}
          disabled={!editor.can().chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "bg-muted" : ""}
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleCodeBlock().run()
          }}
          disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
          className={editor.isActive("codeBlock") ? "bg-muted" : ""}
        >
          <Code className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().undo().focus().run()
          }}
          disabled={!editor.can().chain().undo().run()}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            const currentPos = editor.state.selection.$anchor.pos
            editor.chain().redo().run()
            // Restore cursor position after redo
            setTimeout(() => {
              editor.commands.focus()
              editor.commands.setTextSelection(currentPos)
            }, 0)
          }}
          disabled={!editor.can().chain().redo().run()}
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>
      <div className="relative">
        <EditorContent editor={editor} className="min-h-[200px] max-h-[600px] overflow-y-auto" />
        {isEmpty && (
          <div className="absolute pointer-events-none text-muted-foreground p-4" style={{ top: 0, left: 0, right: 0 }}>
            {placeholder}
          </div>
        )}
      </div>
    </div>
  )
}

