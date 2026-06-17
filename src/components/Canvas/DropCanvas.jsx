import { useState, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useHarmonyStore } from '../../store/useHarmonyStore'
import { useVexFlow } from '../../hooks/useVexFlow'
import { yToPitch } from '../../utils/pitchUtils'

const SNAP_COLS = 28
const STAFF_TOP_OFFSET = 44

/**
 * The main editable melody canvas.
 * Notes can be added by dragging from the toolbar OR by clicking on the staff.
 * Each placed note shows a chip with a ✕ to delete it individually.
 */
export function DropCanvas() {
  const { melody, projectInfo, selectedDuration, addNote, removeNote, toggleTie } =
    useHarmonyStore()
  const { containerRef: vexRef } = useVexFlow(melody, projectInfo)

  const [snapGuide, setSnapGuide] = useState(null)
  const containerRef = useRef(null)

  const { setNodeRef, isOver } = useDroppable({ id: 'score-drop-zone' })

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

  function handleDragOver(e) {
    e.preventDefault()
    const g = pitchFromEvent(e)
    if (g) setSnapGuide(g)
  }

  // Click anywhere on the staff to add a note at that pitch
  function handleClick(e) {
    const g = pitchFromEvent(e)
    if (!g) return
    addNote({ type: 'note', pitch: g.pitch, duration: selectedDuration })
  }

  return (
    <div
      ref={(node) => { setNodeRef(node); containerRef.current = node }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setSnapGuide(null)}
      onDragOver={handleDragOver}
      onDragLeave={() => setSnapGuide(null)}
      onDrop={(e) => { e.preventDefault(); setSnapGuide(null) }}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 160,
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
          Click on the staff or drag from the toolbar to add notes
        </div>
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
            <div key={n.id} style={chipWrap(n.type === 'rest')}>
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

function chipWrap(isRest) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '2px 4px',
    borderRadius: 4,
    background: isRest ? 'rgba(160,160,160,0.12)' : 'var(--accent-dim)',
    border: `1px solid ${isRest ? 'var(--text-muted)' : 'var(--accent)'}`,
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

const tieActive = {
  background: 'var(--accent)',
  color: '#fff',
}

const deleteBtn = {
  background: 'rgba(242,92,84,0.15)',
  color: 'var(--danger)',
}
