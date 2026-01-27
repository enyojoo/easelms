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
  List,
  ListOrdered,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export default function RichTextEditor({ content, onChange, placeholder = "Start typing..." }: RichTextEditorProps) {
  const [isEmpty, setIsEmpty] = useState(true)
  const [updateCount, setUpdateCount] = useState(0)
  const isUpdatingFromPropRef = useRef(false)
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: true,
        heading: false,
        bulletList: {
          HTMLAttributes: {
            class: "list-disc list-inside my-2",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal list-inside my-2",
          },
        },
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
      // Don't trigger onChange if we're updating from prop to avoid circular updates
      if (!isUpdatingFromPropRef.current) {
        onChange(editor.getHTML())
      }
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

  // Update editor content when content prop changes (only if different from current content)
  useEffect(() => {
    if (!editor) return
    
    const currentContent = editor.getHTML()
    const normalizedContent = content || ""
    const normalizedCurrent = currentContent || ""
    
    // Only update if content is actually different from what's in the editor
    // This prevents cursor jumps when user types (content prop matches editor content)
    if (normalizedContent !== normalizedCurrent) {
      // Preserve cursor position when updating from external source
      const { from, to } = editor.state.selection
      isUpdatingFromPropRef.current = true
      
      editor.commands.setContent(normalizedContent, false)
      setIsEmpty(editor.isEmpty)
      
      // Try to restore cursor position if it's still valid
      try {
        const docSize = editor.state.doc.content.size
        if (from <= docSize && to <= docSize) {
          editor.commands.setTextSelection({ from, to })
        }
      } catch {
        // If restoration fails, cursor will be at the end (default behavior)
      }
      
      // Reset flag after update completes
      setTimeout(() => {
        isUpdatingFromPropRef.current = false
      }, 0)
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
            editor.chain().focus().toggleBulletList().run()
          }}
          disabled={!editor.can().chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-muted" : ""}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().toggleOrderedList().run()
          }}
          disabled={!editor.can().chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-muted" : ""}
        >
          <ListOrdered className="w-4 h-4" />
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

