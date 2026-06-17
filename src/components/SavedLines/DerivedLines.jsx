import { useHarmonyStore } from '../../store/useHarmonyStore'
import { ScoreCanvas } from '../Canvas/ScoreCanvas'

const LABELS = {
  '3rd_harmony': '3rd Harmony',
  '5th_harmony': '5th Harmony',
}

export function DerivedLines() {
  const { derivedLines, projectInfo, removeDerivedLine } = useHarmonyStore()

  if (derivedLines.length === 0) return null

  return (
    <div style={styles.stack}>
      {derivedLines.map((line) => (
        <div key={line.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.label}>{LABELS[line.type] ?? line.type}</span>
            <span style={styles.keySig}>{projectInfo.keySignature} major · auto-generated</span>
            <button
              onClick={() => removeDerivedLine(line.id)}
              style={styles.deleteBtn}
              title="Remove this harmony line"
            >
              ✕
            </button>
          </div>
          <ScoreCanvas
            id={`derived_line_${line.id}`}
            notes={line.notes}
            projectInfo={projectInfo}
          />
        </div>
      ))}
    </div>
  )
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
  keySig: { fontSize: 10, color: 'var(--text-muted)', marginRight: 'auto' },
  deleteBtn: {
    fontSize: 10,
    color: 'var(--text-muted)',
    padding: '2px 5px',
    borderRadius: 3,
    lineHeight: 1.4,
  },
}
