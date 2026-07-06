import { useHarmonyStore } from '../../store/useHarmonyStore'
import { KEY_SIGS, CLEFS, TIME_SIGS } from '../../utils/pitchUtils'

export function SettingsPanel() {
  const projectInfo = useHarmonyStore((s) => s.projectInfo)
  const setProjectInfo = useHarmonyStore((s) => s.setProjectInfo)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label className="toolbar-field">
        <span className="toolbar-field-label">Title</span>
        <input
          value={projectInfo.title}
          onChange={(e) => setProjectInfo({ title: e.target.value })}
          className="toolbar-input"
        />
      </label>

      <label className="toolbar-field">
        <span className="toolbar-field-label">Key Signature</span>
        <select
          value={projectInfo.keySignature}
          onChange={(e) => setProjectInfo({ keySignature: e.target.value })}
          className="toolbar-input"
        >
          {KEY_SIGS.map((k) => <option key={k}>{k}</option>)}
        </select>
      </label>

      <label className="toolbar-field">
        <span className="toolbar-field-label">Clef</span>
        <select
          value={projectInfo.clef}
          onChange={(e) => setProjectInfo({ clef: e.target.value })}
          className="toolbar-input"
        >
          {CLEFS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>

      <label className="toolbar-field">
        <span className="toolbar-field-label">Time Signature</span>
        <select
          value={projectInfo.timeSignature}
          onChange={(e) => setProjectInfo({ timeSignature: e.target.value })}
          className="toolbar-input"
        >
          {TIME_SIGS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
    </div>
  )
}
