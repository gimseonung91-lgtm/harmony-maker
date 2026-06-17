import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

export function DraggableNote({ pitch, duration, label, symbol, kind = 'note' }) {
  const isRest = kind === 'rest'
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drag_${kind}_${pitch ?? duration}_${duration}`,
    data: { type: kind, pitch: isRest ? null : pitch, duration },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '8px 6px',
    borderRadius: 'var(--radius-sm)',
    background: isDragging ? 'var(--accent-dim)' : 'var(--bg-surface)',
    border: `1px solid ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
    minWidth: 52,
    userSelect: 'none',
    transition: 'background 0.15s, border-color 0.15s',
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} title={isRest ? label : `${pitch} — ${label}`}>
      <span style={{ fontSize: 20, lineHeight: 1, color: 'var(--text-primary)' }}>{symbol}</span>
      <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>{isRest ? 'rest' : pitch}</span>
    </div>
  )
}
