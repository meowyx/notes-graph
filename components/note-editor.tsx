"use client"

import { useState, useEffect, useRef } from "react"
import type { Note } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Link2 } from "lucide-react"
import { markdownToHtml } from "@/lib/utils"

interface NoteEditorProps {
  note: Note
  allNotes: Note[]
  onUpdateNote: (note: Note) => void
  onCreateConnection: (sourceId: string, targetId: string) => void
}

export function NoteEditor({ note, allNotes, onUpdateNote, onCreateConnection }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [isPreview, setIsPreview] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const previewRef = useRef<HTMLDivElement>(null)

  // Update local state when the note changes
  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
  }, [note])

  // Save changes when title or content changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (title !== note.title || content !== note.content) {
        onUpdateNote({
          ...note,
          title,
          content,
        })
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [title, content, note, onUpdateNote])

  // Process wiki-style links in preview mode
  useEffect(() => {
    if (isPreview && previewRef.current) {
      const links = previewRef.current.querySelectorAll("a[data-note-link]")

      links.forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault()
          const targetId = link.getAttribute("data-note-link")
          if (targetId) {
            onCreateConnection(note.id, targetId)
          }
        })
      })

      return () => {
        links.forEach((link) => {
          link.removeEventListener("click", () => {})
        })
      }
    }
  }, [isPreview, note.id, onCreateConnection])

  // Process content for wiki-style links
  const processedContent = content.replace(/\[\[(.*?)\]\]/g, (match, noteName) => {
    const foundNote = allNotes.find((n) => n.title.toLowerCase() === noteName.toLowerCase() && n.id !== note.id)

    if (foundNote) {
      return `<a href="#" data-note-link="${foundNote.id}" class="text-primary hover:underline">[[${noteName}]]</a>`
    }

    return match
  })

  const otherNotes = allNotes.filter((n) => n.id !== note.id)

  // Update preview HTML when content changes
  useEffect(() => {
    if (isPreview) {
      markdownToHtml(processedContent).then(setPreviewHtml)
    }
  }, [processedContent, isPreview])

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-bold border-none px-0 focus-visible:ring-0"
          placeholder="Note title"
        />
        <div className="flex items-center gap-2">
          <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Link2 className="h-4 w-4 mr-1" />
                Link Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link to another note</DialogTitle>
              </DialogHeader>
              <div className="max-h-[300px] overflow-y-auto">
                {otherNotes.length > 0 ? (
                  <ul className="space-y-1">
                    {otherNotes.map((otherNote) => (
                      <li key={otherNote.id}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left"
                          onClick={() => {
                            onCreateConnection(note.id, otherNote.id)
                            setLinkDialogOpen(false)
                          }}
                        >
                          {otherNote.title}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">No other notes to link to</div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={() => setIsPreview(!isPreview)}>
            {isPreview ? "Edit" : "Preview"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isPreview ? (
          <div
            ref={previewRef}
            className="prose max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[calc(100%-2rem)] resize-none border-none focus-visible:ring-0 font-mono"
            placeholder="Write your note here... Use [[Note Title]] to link to other notes."
          />
        )}
      </div>
    </div>
  )
}

