import React, { useRef, useState } from 'react'
import { useHarmonyStore } from '../../store/useHarmonyStore'
import { DraggableNote } from './DraggableNote'
import { DURATIONS, RESTS, PITCHES_IN_OCTAVE } from '../../utils/pitchUtils'
import { analyzeScoreImage } from '../../utils/omr'

const CATEGORIES = [
  { id: 'notes', label: 'Notes' },
  { id: 'import', label: 'Import' },
  { id: 'settings', label: 'Settings' },
]

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

const KEY_SIGS = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']
const CLEFS = ['treble', 'bass', 'alto', 'tenor']
const TIME_SIGS = ['4/4', '3/4', '2/4', '6/8', '2/2']

export function Toolbar() {
  const { toolbarOpen, activeCategory, setActiveCategory, projectInfo, setProjectInfo } =
    useHarmonyStore()

  if (!toolbarOpen) return null

  return (
    <aside style={styles.aside}>
      <div style={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{ ...styles.tab, ...(activeCategory === cat.id ? styles.tabActive : {}) }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div style={styles.body}>
        {activeCategory === 'notes' && <NotesPanel />}
        {activeCategory === 'import' && <ImportPanel />}
        {activeCategory === 'settings' && (
          <SettingsPanel projectInfo={projectInfo} setProjectInfo={setProjectInfo} />
        )}
      </div>
    </aside>
  )
}

function NotesPanel() {
  const selectedDuration = useHarmonyStore((s) => s.selectedDuration)
  const setSelectedDuration = useHarmonyStore((s) => s.setSelectedDuration)
  const dur = DURATIONS.find((d) => d.id === selectedDuration)

  return (
    <div>
      <SectionLabel>Duration</SectionLabel>
      <div style={styles.durationRow}>
        {DURATIONS.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDuration(d.id)}
            title={d.label}
            style={{ ...styles.durationBtn, ...(selectedDuration === d.id ? styles.durationBtnActive : {}) }}
          >
            {d.symbol}
          </button>
        ))}
      </div>

      {OCTAVES.map((octave) => (
        <div key={octave}>
          <SectionLabel>Octave {octave}</SectionLabel>
          <div style={styles.noteGrid}>
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
      <div style={styles.noteGrid}>
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

      <p style={styles.hint}>
        Tip: click on the staff to add a note at that pitch (using the selected
        duration), or drag a tile. Use each chip's ✕ to delete a note, ⌒ to tie it.
      </p>
    </div>
  )
}

function ImportPanel() {
  const setMelody = useHarmonyStore((s) => s.setMelody)
  const inputRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [fileName, setFileName] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setStatus('loading')
    try {
      const notes = await analyzeScoreImage(file)
      setMelody(notes)
      setStatus('done')
    } catch {
      setStatus('error')
    } finally {
      e.target.value = '' // allow re-uploading the same file
    }
  }

  return (
    <div>
      <SectionLabel>Sheet-music image (OMR)</SectionLabel>
      <p style={styles.hint}>
        Upload a photo of sheet music. The notes are detected and loaded into the
        melody line automatically.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === 'loading'}
        style={styles.uploadBtn}
      >
        {status === 'loading' ? 'Analyzing…' : '↑  Upload score image'}
      </button>

      {status === 'done' && (
        <p style={{ ...styles.statusLine, color: 'var(--success)' }}>
          ✓ Loaded notes from “{fileName}”
        </p>
      )}
      {status === 'error' && (
        <p style={{ ...styles.statusLine, color: 'var(--danger)' }}>
          Could not analyze the image. Try another file.
        </p>
      )}
    </div>
  )
}

function SettingsPanel({ projectInfo, setProjectInfo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label style={styles.field}>
        <span style={styles.fieldLabel}>Title</span>
        <input
          value={projectInfo.title}
          onChange={(e) => setProjectInfo({ title: e.target.value })}
          style={styles.input}
        />
      </label>

      <label style={styles.field}>
        <span style={styles.fieldLabel}>Key Signature</span>
        <select
          value={projectInfo.keySignature}
          onChange={(e) => setProjectInfo({ keySignature: e.target.value })}
          style={styles.input}
        >
          {KEY_SIGS.map((k) => <option key={k}>{k}</option>)}
        </select>
      </label>

      <label style={styles.field}>
        <span style={styles.fieldLabel}>Clef</span>
        <select
          value={projectInfo.clef}
          onChange={(e) => setProjectInfo({ clef: e.target.value })}
          style={styles.input}
        >
          {CLEFS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>

      <label style={styles.field}>
        <span style={styles.fieldLabel}>Time Signature</span>
        <select
          value={projectInfo.timeSignature}
          onChange={(e) => setProjectInfo({ timeSignature: e.target.value })}
          style={styles.input}
        >
          {TIME_SIGS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
    </div>
  )
}

function SectionLabel({ children }) {
  return <p style={styles.sectionLabel}>{children}</p>
}

const styles = {
  aside: {
    width: 'var(--toolbar-width)',
    minWidth: 'var(--toolbar-width)',
    borderLeft: '1px solid var(--border-subtle)',
    background: 'var(--bg-panel)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  tabs: { display: 'flex', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 },
  tab: {
    flex: 1,
    padding: '10px 0',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    borderBottom: '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: { color: 'var(--accent)', borderBottom: '2px solid var(--accent)' },
  body: { padding: '0 12px 16px', overflowY: 'auto' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    margin: '12px 0 6px',
  },
  durationRow: { display: 'flex', gap: 4 },
  durationBtn: {
    flex: 1,
    padding: '6px 4px',
    fontSize: 16,
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s',
  },
  durationBtnActive: {
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent)',
    color: 'var(--accent)',
  },
  noteGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel: { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.04em' },
  input: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '6px 8px',
    fontSize: 13,
    outline: 'none',
  },
  uploadBtn: {
    width: '100%',
    padding: '10px 12px',
    marginTop: 8,
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-surface)',
    border: '1px dashed var(--border)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 500,
    transition: 'border-color 0.15s, background 0.15s',
  },
  statusLine: { fontSize: 11, marginTop: 8, lineHeight: 1.5 },
  hint: { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 },
}
