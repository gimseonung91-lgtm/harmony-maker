// Header: identity, project chips (key/clef/time), and the command rows.
// Memoized — it re-renders only when its own store selections change, never
// because of unrelated edits like typing lyrics.
import { memo } from 'react'
import { useHarmonyStore } from '../../store/useHarmonyStore'
import { KEY_SIGS, TIME_SIGS, CLEF_LABELS } from '../../utils/pitchUtils'
import './AppHeader.css'

function Chip({ label, sublabel }) {
  return (
    <div className="chip">
      <span className="chip-value">{label}</span>
      <span className="chip-label">{sublabel}</span>
    </div>
  )
}

// A Chip whose value is directly editable from the header.
function ChipSelect({ value, options, onChange, sublabel, title }) {
  return (
    <div className="chip" title={title}>
      <select
        className="chip-select"
        aria-label={title}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="chip-label">{sublabel} ▾</span>
    </div>
  )
}

function HeaderBtn({ children, onClick, disabled, accent, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`header-btn${accent ? ' header-btn--accent' : ''}`}
    >
      {children}
    </button>
  )
}

export const AppHeader = memo(function AppHeader({
  isPlaying, isRendering, hasContent, onPlay, onStop, onDownload, onExport,
}) {
  const projectInfo = useHarmonyStore((s) => s.projectInfo)
  const bpm = useHarmonyStore((s) => s.bpm)
  const toolbarOpen = useHarmonyStore((s) => s.toolbarOpen)
  const hasMelody = useHarmonyStore((s) => s.melody.length > 0)
  const setProjectInfo = useHarmonyStore((s) => s.setProjectInfo)
  const setBpm = useHarmonyStore((s) => s.setBpm)
  const toggleToolbar = useHarmonyStore((s) => s.toggleToolbar)
  const generateHarmony = useHarmonyStore((s) => s.generateHarmony)
  const clearAll = useHarmonyStore((s) => s.clearAll)

  return (
    <header className="app-header">
      <div className="app-header-left">
        <span className="app-logo">Harmony Maker</span>
        <span className="app-project-title">{projectInfo.title}</span>
      </div>

      <div className="app-header-actions">
        {/* Primary group: project chips + transport */}
        <div className="header-group">
          <ChipSelect
            value={projectInfo.keySignature}
            options={KEY_SIGS}
            onChange={(v) => setProjectInfo({ keySignature: v })}
            sublabel="조성"
            title="조성"
          />
          <Chip label={CLEF_LABELS[projectInfo.clef] ?? projectInfo.clef} sublabel="음자리표" />
          <ChipSelect
            value={projectInfo.timeSignature}
            options={TIME_SIGS}
            onChange={(v) => setProjectInfo({ timeSignature: v })}
            sublabel="박자"
            title="박자"
          />

          <div className="header-divider" />

          {isPlaying ? (
            <HeaderBtn onClick={onStop} accent title="재생 정지">
              ■ 정지
            </HeaderBtn>
          ) : (
            <HeaderBtn onClick={onPlay} disabled={!hasContent} accent title="켜져 있는 트랙 재생">
              ▶ 재생
            </HeaderBtn>
          )}
          <div className="bpm-wrap" title="템포 (BPM)">
            <input
              type="number"
              min={40}
              max={240}
              value={bpm}
              aria-label="템포 (BPM)"
              onChange={(e) => setBpm(Number(e.target.value) || 90)}
              className="bpm-input"
            />
            <span className="bpm-label">BPM</span>
          </div>
        </div>

        {/* Secondary group: exports + score commands */}
        <div className="header-group">
          {isRendering ? (
            <HeaderBtn disabled title="음원 렌더링 중…">
              ⏳ 렌더링 중…
            </HeaderBtn>
          ) : (
            <>
              <HeaderBtn
                onClick={() => onDownload('wav')}
                disabled={!hasContent}
                title="켜져 있는 트랙을 WAV로 다운로드"
              >
                ⤓ WAV
              </HeaderBtn>
              <HeaderBtn
                onClick={() => onDownload('webm')}
                disabled={!hasContent}
                title="켜져 있는 트랙을 WebM으로 다운로드"
              >
                ⤓ WebM
              </HeaderBtn>
            </>
          )}

          <div className="header-divider" />

          <HeaderBtn onClick={clearAll} title="멜로디와 화음 라인을 모두 지웁니다">
            비우기
          </HeaderBtn>
          <HeaderBtn
            onClick={() => generateHarmony('3rd')}
            disabled={!hasMelody}
            accent
            title="멜로디 아래에 독립된 3도 화음 보표를 생성합니다"
          >
            + 3도 화음
          </HeaderBtn>
          <HeaderBtn
            onClick={() => generateHarmony('5th')}
            disabled={!hasMelody}
            accent
            title="멜로디 아래에 독립된 5도 화음 보표를 생성합니다"
          >
            + 5도 화음
          </HeaderBtn>
          <HeaderBtn
            onClick={onExport}
            disabled={!hasMelody}
            title="멜로디와 모든 화음 라인을 PDF로 내보냅니다"
          >
            PDF 내보내기
          </HeaderBtn>

          <div className="header-divider" />

          <button
            id="toolbar-toggle"
            onClick={toggleToolbar}
            className="header-icon-btn"
            aria-expanded={toolbarOpen}
            aria-controls="tool-surface"
            title={toolbarOpen ? '도구함 숨기기' : '도구함 열기'}
            aria-label={toolbarOpen ? '도구함 숨기기' : '도구함 열기'}
          >
            {toolbarOpen ? '⟩' : '⟨'}
          </button>
        </div>
      </div>
    </header>
  )
})
