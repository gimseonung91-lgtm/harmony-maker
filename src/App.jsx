import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useState } from 'react'
import { useHarmonyStore } from './store/useHarmonyStore'
import { Toolbar } from './components/Toolbar/Toolbar'
import { DropCanvas } from './components/Canvas/DropCanvas'
import { DerivedLines } from './components/SavedLines/DerivedLines'
import { exportToPDF } from './utils/pdfExport'

export default function App() {
  const {
    projectInfo,
    melody,
    derivedLines,
    toolbarOpen,
    toggleToolbar,
    addNote,
    generateHarmony,
    clearAll,
  } = useHarmonyStore()

  const [activeItem, setActiveItem] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function handleDragStart({ active }) {
    setActiveItem(active.data.current)
  }

  function handleDragEnd({ active, over }) {
    setActiveItem(null)
    if (over?.id === 'score-drop-zone') {
      const { type, pitch, duration } = active.data.current
      addNote({ type, pitch, duration })
    }
  }

  async function handleExport() {
    const ids = ['melody_line', ...derivedLines.map((l) => `derived_line_${l.id}`)]
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
              <p style={layout.sectionLabel}>Melody · {projectInfo.keySignature} major</p>
              <div id="melody_line">
                <DropCanvas />
              </div>
            </div>
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
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
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
