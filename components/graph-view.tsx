"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import type { Note, Connection } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Trash2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"

interface GraphViewProps {
  notes: Note[]
  connections: Connection[]
  activeNoteId: string | null
  onSelectNote: (id: string) => void
  onDeleteConnection: (id: string) => void
}

interface NodePosition {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  title: string
  isActive: boolean
}

export function GraphView({ notes, connections, activeNoteId, onSelectNote, onDeleteConnection }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodes, setNodes] = useState<NodePosition[]>([])
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Initialize nodes with random positions
  useEffect(() => {
    if (!containerRef.current) return

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    const newNodes = notes.map((note) => ({
      id: note.id,
      x: Math.random() * width * 0.8 + width * 0.1,
      y: Math.random() * height * 0.8 + height * 0.1,
      vx: 0,
      vy: 0,
      radius: note.id === activeNoteId ? 20 : 15,
      title: note.title,
      isActive: note.id === activeNoteId,
    }))

    setNodes(newNodes)
  }, [notes, activeNoteId])

  // Update active node
  useEffect(() => {
    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        radius: node.id === activeNoteId ? 20 : 15,
        isActive: node.id === activeNoteId,
      })),
    )
  }, [activeNoteId])

  // Force-directed graph simulation
  useEffect(() => {
    if (nodes.length === 0) return

    const simulation = () => {
      setNodes((prevNodes) => {
        // Skip simulation if dragging a node
        if (isDragging && draggedNodeId) {
          return prevNodes
        }

        return prevNodes.map((node) => {
          let fx = 0
          let fy = 0

          // Repulsive force between nodes
          prevNodes.forEach((otherNode) => {
            if (node.id === otherNode.id) return

            const dx = node.x - otherNode.x
            const dy = node.y - otherNode.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            const force = 200 / (distance + 1)

            fx += (dx / distance || 0) * force
            fy += (dy / distance || 0) * force
          })

          // Attractive force for connected nodes
          connections.forEach((conn) => {
            if (conn.sourceId === node.id || conn.targetId === node.id) {
              const connectedNodeId = conn.sourceId === node.id ? conn.targetId : conn.sourceId
              const connectedNode = prevNodes.find((n) => n.id === connectedNodeId)

              if (connectedNode) {
                const dx = node.x - connectedNode.x
                const dy = node.y - connectedNode.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                const force = distance / 10

                fx -= (dx / distance || 0) * force
                fy -= (dy / distance || 0) * force
              }
            }
          })

          // Center gravity
          if (containerRef.current) {
            const centerX = containerRef.current.clientWidth / 2
            const centerY = containerRef.current.clientHeight / 2
            fx -= (node.x - centerX) * 0.01
            fy -= (node.y - centerY) * 0.01
          }

          // Update velocity and position
          const vx = (node.vx + fx) * 0.3
          const vy = (node.vy + fy) * 0.3

          return {
            ...node,
            x: node.x + vx,
            y: node.y + vy,
            vx,
            vy,
          }
        })
      })
    }

    const intervalId = setInterval(simulation, 30)
    return () => clearInterval(intervalId)
  }, [nodes.length, connections, isDragging, draggedNodeId])

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !containerRef.current) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = containerRef.current.clientWidth
    canvas.height = containerRef.current.clientHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(scale, scale)
    ctx.translate((canvas.width / scale - canvas.width) / 2, (canvas.height / scale - canvas.height) / 2)

    // Draw connections
    connections.forEach((conn) => {
      const sourceNode = nodes.find((node) => node.id === conn.sourceId)
      const targetNode = nodes.find((node) => node.id === conn.targetId)

      if (sourceNode && targetNode) {
        ctx.beginPath()
        ctx.moveTo(sourceNode.x, sourceNode.y)
        ctx.lineTo(targetNode.x, targetNode.y)

        if (hoveredConnection === conn.id) {
          ctx.strokeStyle = "rgba(220, 50, 50, 0.8)"
          ctx.lineWidth = 3
        } else {
          ctx.strokeStyle = "rgba(150, 150, 150, 0.6)"
          ctx.lineWidth = 2
        }

        ctx.stroke()
      }
    })

    // Draw nodes
    nodes.forEach((node) => {
      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)

      if (node.isActive) {
        ctx.fillStyle = "rgba(147, 51, 234, 0.9)" // Purple for active node
        ctx.strokeStyle = "rgba(147, 51, 234, 1)"
      } else {
        ctx.fillStyle = "rgba(59, 130, 246, 0.7)" // Blue for regular nodes
        ctx.strokeStyle = "rgba(59, 130, 246, 0.9)"
      }

      ctx.fill()
      ctx.lineWidth = 2
      ctx.stroke()

      // Node label
      ctx.font = "12px sans-serif"
      ctx.fillStyle = "#fff"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Truncate long titles
      let title = node.title
      if (title.length > 15) {
        title = title.substring(0, 12) + "..."
      }

      ctx.fillText(title, node.x, node.y)
    })

    ctx.restore()
  }, [nodes, connections, hoveredConnection, scale])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth
        canvasRef.current.height = containerRef.current.clientHeight
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    setMousePos({ x, y })

    // Handle node dragging
    if (isDragging && draggedNodeId) {
      setNodes((prev) => prev.map((node) => (node.id === draggedNodeId ? { ...node, x, y, vx: 0, vy: 0 } : node)))
      return
    }

    // Check if hovering over a connection
    let hoveredConn: string | null = null

    connections.forEach((conn) => {
      const sourceNode = nodes.find((node) => node.id === conn.sourceId)
      const targetNode = nodes.find((node) => node.id === conn.targetId)

      if (sourceNode && targetNode) {
        // Calculate distance from point to line
        const A = x - sourceNode.x
        const B = y - sourceNode.y
        const C = targetNode.x - sourceNode.x
        const D = targetNode.y - sourceNode.y

        const dot = A * C + B * D
        const lenSq = C * C + D * D
        let param = -1

        if (lenSq !== 0) {
          param = dot / lenSq
        }

        let xx, yy

        if (param < 0) {
          xx = sourceNode.x
          yy = sourceNode.y
        } else if (param > 1) {
          xx = targetNode.x
          yy = targetNode.y
        } else {
          xx = sourceNode.x + param * C
          yy = sourceNode.y + param * D
        }

        const dx = x - xx
        const dy = y - yy
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 5) {
          hoveredConn = conn.id
        }
      }
    })

    setHoveredConnection(hoveredConn)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    // Check if clicking on a node
    const clickedNode = nodes.find((node) => {
      const dx = node.x - x
      const dy = node.y - y
      return Math.sqrt(dx * dx + dy * dy) <= node.radius
    })

    if (clickedNode) {
      setIsDragging(true)
      setDraggedNodeId(clickedNode.id)
    }

    // Check if clicking on a connection
    if (hoveredConnection) {
      onDeleteConnection(hoveredConnection)
    }
  }

  const handleMouseUp = () => {
    if (isDragging && draggedNodeId) {
      // If just clicking (not dragging), select the node
      if (
        Math.abs(nodes.find((n) => n.id === draggedNodeId)?.vx || 0) < 0.1 &&
        Math.abs(nodes.find((n) => n.id === draggedNodeId)?.vy || 0) < 0.1
      ) {
        onSelectNote(draggedNodeId)
      }
    }

    setIsDragging(false)
    setDraggedNodeId(null)
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 2))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5))
  }

  const resetZoom = () => {
    setScale(1)
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant="outline" size="icon" onClick={zoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={zoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={resetZoom}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {hoveredConnection && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute h-6 w-6"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            transform: "translate(-50%, -50%)",
          }}
          onClick={() => onDeleteConnection(hoveredConnection)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}

      {notes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          Create some notes to see them in the graph view
        </div>
      )}
    </div>
  )
}
