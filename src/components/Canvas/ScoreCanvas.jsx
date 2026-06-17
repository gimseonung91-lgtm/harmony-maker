import { useVexFlow } from '../../hooks/useVexFlow'

/**
 * Renders one line of notes via VexFlow (read-only view).
 */
export function ScoreCanvas({ notes, projectInfo, id }) {
  const { containerRef } = useVexFlow(notes, projectInfo)

  return (
    <div
      id={id}
      ref={containerRef}
      style={{
        width: '100%',
        minHeight: 120,
        background: 'var(--canvas-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    />
  )
}
