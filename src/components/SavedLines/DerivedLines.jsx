import { useShallow } from 'zustand/react/shallow'
import { useHarmonyStore } from '../../store/useHarmonyStore'
import { ScoreCanvas } from '../Canvas/ScoreCanvas'
import { TrackToggle } from '../TrackToggle'

const LABELS = {
  '3rd_harmony': '3도 화음',
  '5th_harmony': '5도 화음',
}

export function DerivedLines() {
  const { derivedLines, projectInfo, enabledTracks, toggleTrack, removeDerivedLine } =
    useHarmonyStore(useShallow((s) => ({
      derivedLines: s.derivedLines,
      projectInfo: s.projectInfo,
      enabledTracks: s.enabledTracks,
      toggleTrack: s.toggleTrack,
      removeDerivedLine: s.removeDerivedLine,
    })))

  if (derivedLines.length === 0) return null

  return (
    <div style={styles.stack}>
      {derivedLines.map((line) => (
        <div key={line.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <TrackToggle
              enabled={enabledTracks[line.id] !== false}
              onToggle={() => toggleTrack(line.id)}
            />
            <span style={styles.label}>{LABELS[line.type] ?? line.type}</span>
            <span style={styles.keySig}>{projectInfo.keySignature} 장조 · 자동 생성</span>
            <button
              onClick={() => removeDerivedLine(line.id)}
              style={styles.deleteBtn}
              title="이 화음 라인을 삭제합니다"
              aria-label={`${LABELS[line.type] ?? line.type} 라인 삭제`}
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
