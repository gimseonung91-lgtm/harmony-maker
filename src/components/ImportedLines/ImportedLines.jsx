import { useShallow } from 'zustand/react/shallow'
import { useHarmonyStore } from '../../store/useHarmonyStore'
import { ScoreCanvas } from '../Canvas/ScoreCanvas'
import { TrackToggle } from '../TrackToggle'

export function ImportedLines() {
  const { importedLines, projectInfo, enabledTracks, toggleTrack, removeLine, moveLine, splitLine, editImportedLine } =
    useHarmonyStore(useShallow((s) => ({
      importedLines: s.importedLines,
      projectInfo: s.projectInfo,
      enabledTracks: s.enabledTracks,
      toggleTrack: s.toggleTrack,
      removeLine: s.removeLine,
      moveLine: s.moveLine,
      splitLine: s.splitLine,
      editImportedLine: s.editImportedLine,
    })))

  if (importedLines.length === 0) return null

  return (
    <div style={styles.stack}>
      {importedLines.map((line, i) => {
        const measureCount = new Set(line.notes.map((n) => n.measure ?? 0)).size
        return (
          <div key={line.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <TrackToggle
                enabled={enabledTracks[line.id] !== false}
                onToggle={() => toggleTrack(line.id)}
              />
              <span style={styles.label}>Line {i + 1}</span>
              <span style={styles.meta}>{line.notes.length} notes · {measureCount} measures</span>

              <div style={styles.actions}>
                <button
                  onClick={() => editImportedLine(line.id)}
                  style={{ ...btnStyle(false), color: 'var(--accent)' }}
                  title="Load this line into the melody editor (replaces the current melody; Ctrl+Z restores it)"
                  aria-label={`Edit line ${i + 1} in the melody editor`}
                >
                  ✎ Edit
                </button>
                <button
                  onClick={() => moveLine(line.id, 'up')}
                  disabled={i === 0}
                  style={btnStyle(i === 0)}
                  title="Move line up"
                  aria-label={`Move line ${i + 1} up`}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveLine(line.id, 'down')}
                  disabled={i === importedLines.length - 1}
                  style={btnStyle(i === importedLines.length - 1)}
                  title="Move line down"
                  aria-label={`Move line ${i + 1} down`}
                >
                  ↓
                </button>
                <button
                  onClick={() => splitLine(line.id)}
                  disabled={measureCount <= 1}
                  style={btnStyle(measureCount <= 1)}
                  title="Split into one line per measure"
                  aria-label={`Split line ${i + 1} into one line per measure`}
                >
                  Split
                </button>
                <button
                  onClick={() => removeLine(line.id)}
                  style={{ ...btnStyle(false), color: 'var(--danger)' }}
                  title="Delete this line"
                  aria-label={`Delete line ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            </div>
            <ScoreCanvas
              id={`imported_line_${line.id}`}
              notes={line.notes}
              projectInfo={projectInfo}
            />
          </div>
        )
      })}
    </div>
  )
}

function btnStyle(disabled) {
  return {
    fontSize: 11,
    lineHeight: 1.4,
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  }
}

const styles = {
  stack: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 },
  card: {
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-panel)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--accent)' },
  meta: { fontSize: 10, color: 'var(--text-muted)', marginRight: 'auto' },
  actions: { display: 'flex', alignItems: 'center', gap: 4 },
}
