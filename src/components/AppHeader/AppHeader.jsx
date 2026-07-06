// Header: identity, project chips (key/clef/time), and the command rows.
// Memoized — it re-renders only when its own store selections change, never
// because of unrelated edits like typing lyrics.
import { memo } from 'react'
import { useHarmonyStore } from '../../store/useHarmonyStore'
import { KEY_SIGS, TIME_SIGS } from '../../utils/pitchUtils'
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
            sublabel="key"
            title="Key signature"
          />
          <Chip label={projectInfo.clef} sublabel="clef" />
          <ChipSelect
            value={projectInfo.timeSignature}
            options={TIME_SIGS}
            onChange={(v) => setProjectInfo({ timeSignature: v })}
            sublabel="time"
            title="Time signature"
          />

          <div className="header-divider" />

          {isPlaying ? (
            <HeaderBtn onClick={onStop} accent title="Stop playback">
              ■ Stop
            </HeaderBtn>
          ) : (
            <HeaderBtn onClick={onPlay} disabled={!hasContent} accent title="Play enabled tracks">
              ▶ Play
            </HeaderBtn>
          )}
          <div className="bpm-wrap" title="Tempo (BPM)">
            <input
              type="number"
              min={40}
              max={240}
              value={bpm}
              aria-label="Tempo in BPM"
              onChange={(e) => setBpm(Number(e.target.value) || 90)}
              className="bpm-input"
            />
            <span className="bpm-label">BPM</span>
          </div>
        </div>

        {/* Secondary group: exports + score commands */}
        <div className="header-group">
          {isRendering ? (
            <HeaderBtn disabled title="Rendering audio…">
              ⏳ Rendering…
            </HeaderBtn>
          ) : (
            <>
              <HeaderBtn
                onClick={() => onDownload('wav')}
                disabled={!hasContent}
                title="Download enabled tracks as WAV"
              >
                ⤓ WAV
              </HeaderBtn>
              <HeaderBtn
                onClick={() => onDownload('webm')}
                disabled={!hasContent}
                title="Download enabled tracks as WebM"
              >
                ⤓ WebM
              </HeaderBtn>
            </>
          )}

          <div className="header-divider" />

          <HeaderBtn onClick={clearAll} title="Clear melody and harmony lines">
            Clear
          </HeaderBtn>
          <HeaderBtn
            onClick={() => generateHarmony('3rd')}
            disabled={!hasMelody}
            accent
            title="Generate an independent 3rd-harmony staff below the melody"
          >
            + 3rd Harmony
          </HeaderBtn>
          <HeaderBtn
            onClick={() => generateHarmony('5th')}
            disabled={!hasMelody}
            accent
            title="Generate an independent 5th-harmony staff below the melody"
          >
            + 5th Harmony
          </HeaderBtn>
          <HeaderBtn
            onClick={onExport}
            disabled={!hasMelody}
            title="Export the melody and all harmony lines as PDF"
          >
            Export PDF
          </HeaderBtn>

          <div className="header-divider" />

          <button
            id="toolbar-toggle"
            onClick={toggleToolbar}
            className="header-icon-btn"
            aria-expanded={toolbarOpen}
            aria-controls="tool-surface"
            title={toolbarOpen ? 'Hide toolbar' : 'Show toolbar'}
            aria-label={toolbarOpen ? 'Hide toolbar' : 'Show toolbar'}
          >
            {toolbarOpen ? '⟩' : '⟨'}
          </button>
        </div>
      </div>
    </header>
  )
})
