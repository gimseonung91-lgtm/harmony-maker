import { useHarmonyStore } from '../../store/useHarmonyStore'
import { KEY_SIGS, CLEFS, TIME_SIGS, CLEF_LABELS } from '../../utils/pitchUtils'

export function SettingsPanel() {
  const projectInfo = useHarmonyStore((s) => s.projectInfo)
  const setProjectInfo = useHarmonyStore((s) => s.setProjectInfo)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label className="toolbar-field">
        <span className="toolbar-field-label">제목</span>
        <input
          value={projectInfo.title}
          onChange={(e) => setProjectInfo({ title: e.target.value })}
          className="toolbar-input"
        />
      </label>

      <label className="toolbar-field">
        <span className="toolbar-field-label">조성</span>
        <select
          value={projectInfo.keySignature}
          onChange={(e) => setProjectInfo({ keySignature: e.target.value })}
          className="toolbar-input"
        >
          {KEY_SIGS.map((k) => <option key={k}>{k}</option>)}
        </select>
      </label>

      <label className="toolbar-field">
        <span className="toolbar-field-label">음자리표</span>
        <select
          value={projectInfo.clef}
          onChange={(e) => setProjectInfo({ clef: e.target.value })}
          className="toolbar-input"
        >
          {CLEFS.map((c) => <option key={c} value={c}>{CLEF_LABELS[c] ?? c}</option>)}
        </select>
      </label>

      <label className="toolbar-field">
        <span className="toolbar-field-label">박자</span>
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
