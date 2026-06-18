import { useState, useRef } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useHarmonyStore } from '../../store/useHarmonyStore'
import { useVexFlow } from '../../hooks/useVexFlow'
import { yToPitch } from '../../utils/pitchUtils'

const SNAP_COLS = 28
export const STAFF_TOP_OFFSET = 44

/**
 * The main editable melody canvas.
 * - Drag toolbar tiles or click the staff to add notes (inserted by X position).
 * - Drag a placed note's handle to reorder it / change its pitch.
 * - Click a handle to select a note (number keys 1–5 then change its length).
 * - Type lyrics in the row beneath each note.
 */
export function DropCanvas() {
  const {
    melody, projectInfo, selectedDuration, selectedNoteId,
    notePositions, setNotePositions, addNote, removeNote, toggleTie,
    selectNote, setLyric,
  } = useHarmonyStore()

  const { containerRef: vexRef } = useVexFlow(melody, projectInfo, setNotePositions)

  const [snapGuide, setSnapGuide] = useState(null)
  const containerRef = useRef(null)

  const { setNodeRef, isOver } = useDroppable({ id: 'score-drop-zone' })

  const posMap = {}
  notePositions.forEach((p) => { posMap[p.id] = p.x })

  function pitchFromEvent(e) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    const relX = e.clientX - rect.left
    const relY = e.clientY - rect.top - STAFF_TOP_OFFSET
    const colW = rect.width / SNAP_COLS
    const snappedX = Math.round(relX / colW) * colW
    return { x: snappedX, pitch: yToPitch(Math.max(0, relY)) }
  }

  function handleMouseMove(e) {
    const g = pitchFromEvent(e)
    if (g) setSnapGuide(g)
  }

  // Click empty staff area to add a note at that pitch (inserted by X position)
  function handleClick(e) {
    const g = pitchFromEvent(e)
    if (!g) return
    const index = notePositions.filter((p) => p.x < g.x).length
    addNote({ type: 'note', pitch: g.pitch, duration: selectedDuration }, index)
  }

  return (
    <div
      ref={(node) => { setNodeRef(node); containerRef.current = node }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setSnapGuide(null)}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 170,
        cursor: 'crosshair',
        background: isOver ? 'rgba(124,106,247,0.04)' : 'var(--canvas-bg)',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${isOver ? 'var(--accent)' : 'var(--border-subtle)'}`,
        transition: 'background 0.15s, border-color 0.15s',
        overflow: 'hidden',
      }}
    >
      <div ref={vexRef} style={{ width: '100%', pointerEvents: 'none' }} />

      {snapGuide && (
        <>
          <div style={{
            position: 'absolute', left: snapGuide.x, top: 0, bottom: 0, width: 1,
            background: 'var(--accent)', opacity: 0.5, pointerEvents: 'none',
          }} />
          <span style={{
            position: 'absolute', left: snapGuide.x + 4, top: 4, fontSize: 10,
            color: 'var(--accent)', pointerEvents: 'none', fontWeight: 600,
          }}>
            {snapGuide.pitch}
          </span>
        </>
      )}

      {melody.length === 0 && !isOver && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', pointerEvents: 'none', color: 'var(--text-muted)',
          fontSize: 12, letterSpacing: '0.04em',
        }}>
          Click the staff or drag from the toolbar — then drag notes to reorder
        </div>
      )}

      {/* Draggable handles over each notehead (reorder / reposition / select) */}
      {melody.map((n) =>
        posMap[n.id] != null ? (
          <NoteHandle
            key={`h_${n.id}`}
            note={n}
            x={posMap[n.id]}
            selected={selectedNoteId === n.id}
            onSelect={selectNote}
          />
        ) : null
      )}

      {/* Lyrics row aligned under each sounding note */}
      {melody.map((n) =>
        n.type !== 'rest' && posMap[n.id] != null ? (
          <input
            key={`ly_${n.id}`}
            value={n.lyric ?? ''}
            onChange={(e) => setLyric(n.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="…"
            style={{
              position: 'absolute', left: posMap[n.id] - 22, top: 128, width: 46,
              textAlign: 'center', fontSize: 11, padding: '1px 2px',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--border)', color: 'var(--text-primary)',
              outline: 'none', pointerEvents: 'auto',
            }}
          />
        ) : null
      )}

      {/* Placed-note chips: explicit ✕ delete + tie toggle */}
      {melody.length > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: 6, left: 60, right: 8,
            display: 'flex', flexWrap: 'wrap', gap: 4, pointerEvents: 'auto',
          }}
        >
          {melody.map((n) => (
            <div key={n.id} style={chipWrap(n.type === 'rest', selectedNoteId === n.id)}>
              <span style={{ fontSize: 9, fontWeight: 600 }}>
                {n.type === 'rest' ? `${n.duration} rest` : n.pitch}
              </span>
              {n.type !== 'rest' && (
                <button
                  onClick={() => toggleTie(n.id)}
                  title="Tie to next note"
                  style={{ ...miniBtn, ...(n.tie ? tieActive : {}) }}
                >
                  ⌒
                </button>
              )}
              <button
                onClick={() => removeNote(n.id)}
                title="Delete this note"
                style={{ ...miniBtn, ...deleteBtn }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NoteHandle({ note, x, selected, onSelect }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `note_${note.id}`,
    data: { kind: 'reposition', noteId: note.id },
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onSelect(note.id) }}
      title="Drag to move · click to select"
      style={{
        position: 'absolute', left: x - 9, top: 24, width: 18, height: 92,
        cursor: 'grab', borderRadius: 4, pointerEvents: 'auto',
        background: selected ? 'rgba(124,106,247,0.18)' : 'transparent',
        border: selected ? '1px solid var(--accent)' : '1px solid transparent',
        opacity: isDragging ? 0.3 : 1,
      }}
    />
  )
}

function chipWrap(isRest, selected) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '2px 4px',
    borderRadius: 4,
    background: isRest ? 'rgba(160,160,160,0.12)' : 'var(--accent-dim)',
    border: `1px solid ${selected ? 'var(--text-primary)' : isRest ? 'var(--text-muted)' : 'var(--accent)'}`,
    color: isRest ? 'var(--text-secondary)' : 'var(--accent)',
    lineHeight: 1.4,
  }
}

const miniBtn = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 14,
  height: 14,
  borderRadius: 3,
  fontSize: 9,
  color: 'inherit',
  background: 'transparent',
  cursor: 'pointer',
  lineHeight: 1,
}

const tieActive = { background: 'var(--accent)', color: '#fff' }
const deleteBtn = { background: 'rgba(242,92,84,0.15)', color: 'var(--danger)' }
