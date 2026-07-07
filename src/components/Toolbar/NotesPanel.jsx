import { useHarmonyStore } from '../../store/useHarmonyStore'
import { DraggableNote } from './DraggableNote'
import { SectionLabel } from './SectionLabel'
import { PITCHES_IN_OCTAVE } from '../../utils/pitchUtils'
import { DURATIONS, RESTS } from '../../domain/durations'

const OCTAVES = [5, 4, 3]

function buildNoteTiles() {
  const tiles = []
  for (const octave of OCTAVES) {
    for (const name of PITCHES_IN_OCTAVE) {
      tiles.push({ pitch: `${name}${octave}`, octave, name })
    }
  }
  return tiles
}

const NOTE_TILES = buildNoteTiles()

export function NotesPanel() {
  const selectedDuration = useHarmonyStore((s) => s.selectedDuration)
  const setSelectedDuration = useHarmonyStore((s) => s.setSelectedDuration)
  const dur = DURATIONS.find((d) => d.id === selectedDuration)

  return (
    <div>
      <SectionLabel>음길이</SectionLabel>
      <div className="toolbar-duration-row">
        {DURATIONS.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDuration(d.id)}
            title={d.label}
            aria-label={d.label}
            aria-pressed={selectedDuration === d.id}
            className={`toolbar-duration-btn${selectedDuration === d.id ? ' toolbar-duration-btn--active' : ''}`}
          >
            {d.symbol}
          </button>
        ))}
      </div>

      {OCTAVES.map((octave) => (
        <div key={octave}>
          <SectionLabel>옥타브 {octave}</SectionLabel>
          <div className="toolbar-note-grid">
            {NOTE_TILES.filter((t) => t.octave === octave).map((t) => (
              <DraggableNote
                key={`${t.pitch}_${selectedDuration}`}
                pitch={t.pitch}
                duration={selectedDuration}
                label={dur?.label ?? ''}
                symbol={dur?.symbol ?? '♩'}
              />
            ))}
          </div>
        </div>
      ))}

      <SectionLabel>쉼표</SectionLabel>
      <div className="toolbar-note-grid">
        {RESTS.map((r) => (
          <DraggableNote
            key={`rest_${r.id}`}
            kind="rest"
            duration={r.id}
            label={r.label}
            symbol={r.symbol}
          />
        ))}
      </div>

      <p className="toolbar-hint">
        팁: 오선지를 클릭하면 그 음높이에 음표가 추가됩니다(선택한 음길이 사용).
        타일을 드래그해서 놓아도 되고, 기존 음표 위에 놓으면 그 음표가 교체됩니다.
        각 칩의 ✕로 삭제, ⌒로 붙임줄을 설정합니다.
      </p>
    </div>
  )
}
