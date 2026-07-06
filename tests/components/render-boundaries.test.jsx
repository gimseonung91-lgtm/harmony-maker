// Render boundaries: unrelated store updates must not re-render narrowed
// components. Counted with React Profiler commits.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Profiler } from 'react'
import { render, act } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { useHarmonyStore } from '../../src/store/useHarmonyStore'
import { NotesPanel } from '../../src/components/Toolbar/NotesPanel'
import { AppHeader } from '../../src/components/AppHeader/AppHeader'
import { DerivedLines } from '../../src/components/SavedLines/DerivedLines'

const g = () => useHarmonyStore.getState()

beforeEach(() => {
  useHarmonyStore.setState({
    projectInfo: { title: 'Untitled', keySignature: 'C', clef: 'treble', timeSignature: '4/4' },
    melody: [], derivedLines: [], importedLines: [],
    enabledTracks: { melody: true }, isPlaying: false, bpm: 90,
    notePositions: [], selectedNoteId: null, selectedDuration: 'q',
    toolbarOpen: true, activeCategory: 'notes', _undo: [],
  })
})

function counted(ui) {
  const onRender = vi.fn()
  const utils = render(<Profiler id="probe" onRender={onRender}>{ui}</Profiler>)
  return { commits: () => onRender.mock.calls.length, ...utils }
}

describe('render boundaries', () => {
  it('setBpm adds zero renders to NotesPanel', () => {
    const { commits } = counted(<DndContext><NotesPanel /></DndContext>)
    const initial = commits()
    act(() => g().setBpm(180))
    expect(commits()).toBe(initial)
  })

  it('setLyric adds zero renders to AppHeader', () => {
    act(() => g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' }))
    const noteId = g().melody[0].id
    const noop = () => {}
    const { commits } = counted(
      <AppHeader
        isPlaying={false} isRendering={false} hasContent
        onPlay={noop} onStop={noop} onDownload={noop} onExport={noop}
      />
    )
    const initial = commits()
    act(() => g().setLyric(noteId, '라라라'))
    expect(commits()).toBe(initial)
  })

  it('setActiveCategory adds zero renders to DerivedLines', () => {
    act(() => {
      useHarmonyStore.setState({
        derivedLines: [{ id: 'd1', type: '3rd_harmony', notes: [] }],
        enabledTracks: { melody: true, d1: true },
      })
    })
    const { commits } = counted(<DerivedLines />)
    const initial = commits()
    act(() => g().setActiveCategory('settings'))
    expect(commits()).toBe(initial)
  })

  it('control fixture: the commit counter IS sensitive to a related update', () => {
    function BpmReader() {
      useHarmonyStore((s) => s.bpm) // subscribed to the field we change
      return <div />
    }
    const { commits } = counted(<BpmReader />)
    const initial = commits()
    act(() => g().setBpm(200))
    expect(commits()).toBe(initial + 1)
  })
})
