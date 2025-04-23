"use client"

import { useEffect, useState } from "react"
import { NoteEditor } from "@/components/note-editor"
import { NoteList } from "@/components/note-list"
import { GraphView } from "@/components/graph-view"
import type { Note, Connection } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, FileText, Network } from "lucide-react"

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [view, setView] = useState<"editor" | "graph">("editor")

  // Load notes and connections from localStorage on initial render
  useEffect(() => {
    const savedNotes = localStorage.getItem("notes")
    const savedConnections = localStorage.getItem("connections")

    if (savedNotes) {
      setNotes(JSON.parse(savedNotes))
    }

    if (savedConnections) {
      setConnections(JSON.parse(savedConnections))
    }
  }, [])

  // Save notes and connections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    localStorage.setItem("connections", JSON.stringify(connections))
  }, [connections])

  const activeNote = notes.find((note) => note.id === activeNoteId) || null

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled Note",
      content: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setNotes([...notes, newNote])
    setActiveNoteId(newNote.id)
    setView("editor")
  }

  const updateNote = (updatedNote: Note) => {
    setNotes(
      notes.map((note) =>
        note.id === updatedNote.id ? { ...updatedNote, updatedAt: new Date().toISOString() } : note,
      ),
    )
  }

  const deleteNote = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id))
    setConnections(connections.filter((conn) => conn.sourceId !== id && conn.targetId !== id))

    if (activeNoteId === id) {
      setActiveNoteId(notes.length > 1 ? notes[0].id : null)
    }
  }

  const createConnection = (sourceId: string, targetId: string) => {
    // Prevent duplicate connections and self-connections
    if (
      sourceId === targetId ||
      connections.some(
        (conn) =>
          (conn.sourceId === sourceId && conn.targetId === targetId) ||
          (conn.sourceId === targetId && conn.targetId === sourceId),
      )
    ) {
      return
    }

    const newConnection: Connection = {
      id: `${sourceId}-${targetId}`,
      sourceId,
      targetId,
    }

    setConnections([...connections, newConnection])
  }

  const deleteConnection = (id: string) => {
    setConnections(connections.filter((conn) => conn.id !== id))
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Notes</h1>
          <Button size="sm" onClick={createNewNote}>
            <PlusCircle className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        <NoteList
          notes={notes}
          activeNoteId={activeNoteId}
          onSelectNote={(id) => {
            setActiveNoteId(id)
            setView("editor")
          }}
          onDeleteNote={deleteNote}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="border-b p-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "editor" | "graph")}>
            <TabsList>
              <TabsTrigger value="editor">
                <FileText className="h-4 w-4 mr-1" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="graph">
                <Network className="h-4 w-4 mr-1" />
                Graph View
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-auto">
          {view === "editor" ? (
            activeNote ? (
              <NoteEditor
                note={activeNote}
                allNotes={notes}
                onUpdateNote={updateNote}
                onCreateConnection={createConnection}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p>No note selected</p>
                  <Button variant="outline" className="mt-2" onClick={createNewNote}>
                    Create a new note
                  </Button>
                </div>
              </div>
            )
          ) : (
            <GraphView
              notes={notes}
              connections={connections}
              activeNoteId={activeNoteId}
              onSelectNote={setActiveNoteId}
              onDeleteConnection={deleteConnection}
            />
          )}
        </div>
      </div>
    </div>
  )
}
