// Drag & drop over the melody staff: toolbar tiles insert or replace notes;
// a placed note's handle repositions it. X maps to the insertion index,
// Y maps to the pitch, and a drop within HIT_RADIUS of an existing note
// replaces that note in place.
import { useState } from 'react'
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useHarmonyStore } from '../store/useHarmonyStore'
import { STAFF_TOP_OFFSET } from '../components/Canvas/DropCanvas'
import { yToPitch } from '../utils/pitchUtils'

const HIT_RADIUS = 14

export function useScoreDragAndDrop() {
  const addNoteAt = useHarmonyStore((s) => s.addNoteAt)
  const moveNote = useHarmonyStore((s) => s.moveNote)
  const replaceNote = useHarmonyStore((s) => s.replaceNote)
  const notePositions = useHarmonyStore((s) => s.notePositions)

  const [activeItem, setActiveItem] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function handleDragStart({ active }) {
    setActiveItem(active.data.current)
  }

  function handleDragEnd({ active, over, delta, activatorEvent }) {
    setActiveItem(null)
    if (over?.id !== 'score-drop-zone') return

    // Drop pointer position → canvas-relative coordinates
    const rect = over.rect
    const dropX = (activatorEvent?.clientX ?? 0) + delta.x - rect.left
    const dropY = (activatorEvent?.clientY ?? 0) + delta.y - rect.top - STAFF_TOP_OFFSET
    const pitch = yToPitch(Math.max(0, dropY))
    const data = active.data.current

    if (data?.kind === 'reposition') {
      // Reorder an existing note: insertion index among the OTHER notes by X
      const index = notePositions.filter(
        (p) => p.id !== data.noteId && p.x < dropX
      ).length
      moveNote(data.noteId, index, pitch)
    } else {
      // Toolbar tile dropped ON an existing note → replace that note in place
      // (the tile defines the new pitch/duration). Otherwise insert by X.
      const hit = notePositions.find((p) => Math.abs(p.x - dropX) <= HIT_RADIUS)
      if (hit) {
        replaceNote(hit.id, { type: data.type, pitch: data.pitch, duration: data.duration })
      } else {
        const index = notePositions.filter((p) => p.x < dropX).length
        addNoteAt({ type: data.type, pitch: data.pitch, duration: data.duration }, index)
      }
    }
  }

  return { sensors, activeItem, handleDragStart, handleDragEnd }
}
