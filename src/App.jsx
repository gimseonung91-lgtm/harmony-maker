import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useState, useEffect } from 'react'
import { useHarmonyStore } from './store/useHarmonyStore'
import { Toolbar } from './components/Toolbar/Toolbar'
import { DropCanvas, STAFF_TOP_OFFSET } from './components/Canvas/DropCanvas'
import { yToPitch } from './utils/pitchUtils'
import { DerivedLines } from './components/SavedLines/DerivedLines'
import { ImportedLines } from './components/ImportedLines/ImportedLines'
import { TrackToggle } from './components/TrackToggle'
import { exportToPDF } from './utils/pdfExport'
import { play, stop, renderMix, renderWav } from './utils/audioEngine'

export default function App() {
  const {
    projectInfo,
    melody,
    derivedLines,
    importedLines,
    enabledTracks,
    isPlaying,
    bpm,
    toolbarOpen,
    toggleToolbar,
    toggleTrack,
    setBpm,
    setIsPlaying,
    addNoteAt,
    moveNote,
    notePositions,
    setSelectedDuration,
    setNoteDuration,
    generateHarmony,
    clearAll,
  } = useHarmonyStore()

  const [activeItem, setActiveItem] = useState(null)
  const [isRendering, setIsRendering] = useState(false)

  // Build the enabled-tracks list shared by playback and audio export.
  function enabledTrackList() {
    const tracks = []
    if (enabledTracks.melody !== false && melody.length > 0) {
      tracks.push({ id: 'melody', notes: melody })
    }
    importedLines.forEach((l) => {
      if (enabledTracks[l.id] !== false) tracks.push({ id: l.id, notes: l.notes })
    })
    derivedLines.forEach((l) => {
      if (enabledTracks[l.id] !== false) tracks.push({ id: l.id, notes: l.notes })
    })
    return tracks
  }

  async function handleDownload(format) {
    const tracks = enabledTrackList()
    if (tracks.length === 0 || isRendering) return
    setIsRendering(true)
    try {
      const blob = format === 'wav'
        ? await renderWav(tracks, bpm)
        : await renderMix(tracks, bpm)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectInfo.title || 'harmony-maker'}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setIsRendering(false)
    }
  }

  // Number keys 1–5 set note length (selected note, else next-draw duration)
  useEffect(() => {
    const KEY_DURATION = { 1: 'w', 2: 'h', 3: 'q', 4: '8', 5: '16' }
    function onKeyDown(e) {
      const dur = KEY_DURATION[e.key]
      if (!dur) return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const id = useHarmonyStore.getState().selectedNoteId
      if (id) setNoteDuration(id, dur)
      else setSelectedDuration(dur)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setNoteDuration, setSelectedDuration])

  function handlePlay() {
    const tracks = enabledTrackList()
    if (tracks.length === 0) return
    setIsPlaying(true)
    play(tracks, bpm, () => setIsPlaying(false))
  }

  function handleStop() {
    stop()
    setIsPlaying(false)
  }

  const hasContent =
    melody.length > 0 || derivedLines.length > 0 || importedLines.length > 0

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function handleDragStart({ active }) {
    setActiveItem(active.data.current)
  }

  function handleDragEnd({ active, over, delta, activatorEvent }) {
    setActiveItem(null)
    if (over?.id !== 'score-drop-zone') return

    // Drop pointer position → canvas-relative coordinates
    const rect = over.rect
    const dropX = (activatorEvent?.clientX ?? 0) + delta.x - rect.left
    const dropY = (activatorEvent?.clientY ?? 0) + delta.y - rect.top - STAFF_TOP_OFFSET
    const pitch = yToPitch(Math.max(0, dropY))
    const data = active.data.current

    if (data?.kind === 'reposition') {
      // Reorder an existing note: insertion index among the OTHER notes by X
      const index = notePositions.filter(
        (p) => p.id !== data.noteId && p.x < dropX
      ).length
      moveNote(data.noteId, index, pitch)
    } else {
      // New note from the toolbar: insert at the X position (no longer append)
      const index = notePositions.filter((p) => p.x < dropX).length
      addNoteAt({ type: data.type, pitch: data.pitch, duration: data.duration }, index)
    }
  }

  async function handleExport() {
    const ids = [
      'melody_line',
      ...importedLines.map((l) => `imported_line_${l.id}`),
      ...derivedLines.map((l) => `derived_line_${l.id}`),
    ]
    await exportToPDF(ids, projectInfo.title)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={layout.root}>
        {/* ── Header ─────────────────────────────────────────── */}
        <header style={layout.header}>
          <div style={layout.headerLeft}>
            <span style={layout.logo}>Harmony Maker</span>
            <span style={layout.projectTitle}>{projectInfo.title}</span>
          </div>
          <div style={layout.headerRight}>
            <Chip label={projectInfo.keySignature} sublabel="key" />
            <Chip label={projectInfo.clef} sublabel="clef" />
            <Chip label={projectInfo.timeSignature} sublabel="time" />

            <div style={layout.divider} />

            {/* Playback controls */}
            {isPlaying ? (
              <HeaderBtn onClick={handleStop} accent title="Stop playback">
                ■ Stop
              </HeaderBtn>
            ) : (
              <HeaderBtn onClick={handlePlay} disabled={!hasContent} accent title="Play enabled tracks">
                ▶ Play
              </HeaderBtn>
            )}
            <div style={layout.bpmWrap} title="Tempo (BPM)">
              <input
                type="number"
                min={40}
                max={240}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value) || 90)}
                style={layout.bpmInput}
              />
              <span style={layout.bpmLabel}>BPM</span>
            </div>

            {/* Audio export */}
            {isRendering ? (
              <HeaderBtn disabled title="Rendering audio…">
                ⏳ Rendering…
              </HeaderBtn>
            ) : (
              <>
                <HeaderBtn
                  onClick={() => handleDownload('wav')}
                  disabled={!hasContent}
                  title="Download enabled tracks as WAV"
                >
                  ⤓ WAV
                </HeaderBtn>
                <HeaderBtn
                  onClick={() => handleDownload('webm')}
                  disabled={!hasContent}
                  title="Download enabled tracks as WebM"
                >
                  ⤓ WebM
                </HeaderBtn>
              </>
            )}

            <div style={layout.divider} />

            <HeaderBtn onClick={clearAll} title="Clear melody and harmony lines">
              Clear
            </HeaderBtn>
            <HeaderBtn
              onClick={() => generateHarmony('3rd')}
              disabled={melody.length === 0}
              accent
              title="Generate an independent 3rd-harmony staff below the melody"
            >
              + 3rd Harmony
            </HeaderBtn>
            <HeaderBtn
              onClick={() => generateHarmony('5th')}
              disabled={melody.length === 0}
              accent
              title="Generate an independent 5th-harmony staff below the melody"
            >
              + 5th Harmony
            </HeaderBtn>
            <HeaderBtn
              onClick={handleExport}
              disabled={melody.length === 0}
              title="Export the melody and all harmony lines as PDF"
            >
              Export PDF
            </HeaderBtn>

            <div style={layout.divider} />

            <button
              onClick={toggleToolbar}
              style={layout.iconBtn}
              title={toolbarOpen ? 'Hide toolbar' : 'Show toolbar'}
            >
              {toolbarOpen ? '⟩' : '⟨'}
            </button>
          </div>
        </header>

        {/* ── Body ───────────────────────────────────────────── */}
        <div style={layout.body}>
          <main style={layout.main}>
            <div style={layout.canvasWrapper}>
              <div style={layout.lineHeader}>
                <TrackToggle
                  enabled={enabledTracks.melody !== false}
                  onToggle={() => toggleTrack('melody')}
                />
                <p style={layout.sectionLabel}>Melody · {projectInfo.keySignature} major</p>
              </div>
              <div id="melody_line">
                <DropCanvas />
              </div>
            </div>
            <ImportedLines />
            <DerivedLines />
          </main>

          <Toolbar />
        </div>
      </div>

      {/* Drag overlay ghost */}
      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <div style={overlay}>
            <span style={{ fontSize: 18 }}>{activeItem.type === 'rest' ? '𝄽' : '♩'}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {activeItem.type === 'rest' ? `${activeItem.duration} rest` : activeItem.pitch}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Chip({ label, sublabel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>{label}</span>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{sublabel}</span>
    </div>
  )
}

function HeaderBtn({ children, onClick, disabled, accent, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '5px 12px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: 500,
        background: accent ? 'var(--accent)' : 'var(--bg-surface)',
        color: accent ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${accent ? 'transparent' : 'var(--border)'}`,
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'opacity 0.15s, background 0.15s',
      }}
    >
      {children}
    </button>
  )
}

const layout = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--bg-base)',
  },
  header: {
    height: 'var(--header-height)',
    minHeight: 'var(--header-height)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border-subtle)',
    gap: 12,
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: 'var(--accent)',
  },
  projectTitle: {
    fontSize: 12,
    color: 'var(--text-muted)',
    borderLeft: '1px solid var(--border)',
    paddingLeft: 12,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    width: 1,
    height: 20,
    background: 'var(--border)',
    margin: '0 2px',
  },
  iconBtn: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    cursor: 'pointer',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    padding: 20,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  canvasWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  lineHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  },
  bpmWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  bpmInput: {
    width: 46,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '4px 6px',
    fontSize: 12,
    outline: 'none',
  },
  bpmLabel: {
    fontSize: 9,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
}

const overlay = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  padding: '8px 10px',
  background: 'var(--bg-panel)',
  border: '1px solid var(--accent)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--accent)',
  boxShadow: 'var(--shadow-lg)',
  pointerEvents: 'none',
}
