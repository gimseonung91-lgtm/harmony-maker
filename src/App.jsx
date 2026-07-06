// App shell: composition only. Behavior lives in the controller hooks
// (shortcuts, drag & drop, playback/export) and the store slices.
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { AppHeader } from './components/AppHeader/AppHeader'
import { MelodySection } from './components/MelodySection'
import { ImportedLines } from './components/ImportedLines/ImportedLines'
import { DerivedLines } from './components/SavedLines/DerivedLines'
import { Toolbar } from './components/Toolbar/Toolbar'
import { useEditorShortcuts } from './hooks/useEditorShortcuts'
import { useScoreDragAndDrop } from './hooks/useScoreDragAndDrop'
import { usePlaybackController } from './hooks/usePlaybackController'
import './styles/app-shell.css'

export default function App() {
  useEditorShortcuts()
  const { sensors, activeItem, handleDragStart, handleDragEnd } = useScoreDragAndDrop()
  const playback = usePlaybackController()

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="app-root">
        <AppHeader
          isPlaying={playback.isPlaying}
          isRendering={playback.isRendering}
          hasContent={playback.hasContent}
          onPlay={playback.play}
          onStop={playback.stop}
          onDownload={playback.download}
          onExport={playback.exportPdf}
        />

        <div className="app-body">
          <main className="app-main">
            <MelodySection />
            <ImportedLines />
            <DerivedLines />
          </main>
          <Toolbar />
        </div>
      </div>

      {/* Drag overlay ghost */}
      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <div style={ghost}>
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

const ghost = {
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
