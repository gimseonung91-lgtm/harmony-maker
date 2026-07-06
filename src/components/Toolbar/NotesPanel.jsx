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
      <SectionLabel>Duration</SectionLabel>
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
          <SectionLabel>Octave {octave}</SectionLabel>
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

      <SectionLabel>Rests</SectionLabel>
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
        Tip: click on the staff to add a note at that pitch (using the selected
        duration), or drag a tile. Use each chip's ✕ to delete a note, ⌒ to tie it.
      </p>
    </div>
  )
}
