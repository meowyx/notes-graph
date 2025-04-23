"use client"

import { useState } from "react"
import type { Note } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Search, X } from "lucide-react"
import { formatDistanceToNow } from "@/lib/utils"

interface NoteListProps {
  notes: Note[]
  activeNoteId: string | null
  onSelectNote: (id: string) => void
  onDeleteNote: (id: string) => void
}

export function NoteList({ notes, activeNoteId, onSelectNote, onDeleteNote }: NoteListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const sortedNotes = [...filteredNotes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 pr-8"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1.5 h-6 w-6"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {sortedNotes.length > 0 ? (
          <ul className="space-y-1">
            {sortedNotes.map((note) => (
              <li key={note.id}>
                <div
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer group ${
                    note.id === activeNoteId ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  }`}
                  onClick={() => onSelectNote(note.id)}
                >
                  <div className="overflow-hidden">
                    <div className="font-medium truncate">{note.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatDistanceToNow(new Date(note.updatedAt))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteNote(note.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            {notes.length === 0 ? "No notes yet" : "No matching notes"}
          </div>
        )}
      </div>
    </div>
  )
}
