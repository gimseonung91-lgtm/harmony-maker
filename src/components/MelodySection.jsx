// The editable melody row: mute toggle, label, and the drop canvas.
import { useHarmonyStore } from '../store/useHarmonyStore'
import { DropCanvas } from './Canvas/DropCanvas'
import { TrackToggle } from './TrackToggle'

export function MelodySection() {
  const keySignature = useHarmonyStore((s) => s.projectInfo.keySignature)
  const melodyEnabled = useHarmonyStore((s) => s.enabledTracks.melody !== false)
  const toggleTrack = useHarmonyStore((s) => s.toggleTrack)

  return (
    <div className="melody-section">
      <div className="line-header">
        <TrackToggle enabled={melodyEnabled} onToggle={() => toggleTrack('melody')} />
        <p className="section-label">Melody · {keySignature} major</p>
      </div>
      <div id="melody_line">
        <DropCanvas />
      </div>
    </div>
  )
}
