// Controller hooks: keyboard shortcuts, score drag & drop, playback/export.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, renderHook, fireEvent, act } from '@testing-library/react'
import { useHarmonyStore } from '../../src/store/useHarmonyStore'
import { useEditorShortcuts } from '../../src/hooks/useEditorShortcuts'
import { useScoreDragAndDrop } from '../../src/hooks/useScoreDragAndDrop'

vi.mock('../../src/services/audioService', () => ({
  loadAudioEngine: vi.fn(),
  stopPlayback: vi.fn(),
}))
vi.mock('../../src/services/exportService', () => ({
  loadPdfExporter: vi.fn(),
}))

import { loadAudioEngine, stopPlayback } from '../../src/services/audioService'
import { loadPdfExporter } from '../../src/services/exportService'
import { usePlaybackController, buildEnabledTracks, buildExportIds } from '../../src/hooks/usePlaybackController'

const g = () => useHarmonyStore.getState()

beforeEach(() => {
  vi.clearAllMocks()
  useHarmonyStore.setState({
    projectInfo: { title: 'Untitled', keySignature: 'C', clef: 'treble', timeSignature: '4/4' },
    melody: [], derivedLines: [], importedLines: [],
    enabledTracks: { melody: true }, isPlaying: false, bpm: 90,
    notePositions: [], selectedNoteId: null, selectedDuration: 'q', _undo: [],
  })
})

function Shortcuts() {
  useEditorShortcuts()
  return <input data-testid="field" />
}

describe('useEditorShortcuts', () => {
  it('maps number keys 1-6 to durations (6 = dotted quarter)', () => {
    render(<Shortcuts />)
    for (const [key, dur] of [['1', 'w'], ['2', 'h'], ['3', 'q'], ['4', '8'], ['5', '16'], ['6', 'qd']]) {
      fireEvent.keyDown(window, { key })
      expect(g().selectedDuration).toBe(dur)
    }
  })

  it('retargets the selected note and ignores keys typed into fields', () => {
    const { getByTestId } = render(<Shortcuts />)
    act(() => g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' }))
    const id = g().melody[0].id
    act(() => useHarmonyStore.setState({ selectedNoteId: id }))
    fireEvent.keyDown(window, { key: '6' })
    expect(g().melody[0].duration).toBe('qd')
    expect(g().selectedDuration).toBe('q') // unchanged when a note is selected

    fireEvent.keyDown(getByTestId('field'), { key: '2' })
    expect(g().melody[0].duration).toBe('qd') // typing in a field is ignored
  })

  it('undoes on Ctrl+Z', () => {
    render(<Shortcuts />)
    act(() => g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' }))
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(g().melody).toEqual([])
  })
})

describe('useScoreDragAndDrop', () => {
  const overCanvas = { id: 'score-drop-zone', rect: { left: 0, top: 0 } }
  const at = (x, y) => ({ activatorEvent: { clientX: x, clientY: y }, delta: { x: 0, y: 0 } })

  it('inserts a toolbar tile by X position', () => {
    act(() => {
      g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
      g().addNoteAt({ type: 'note', pitch: 'E4', duration: 'q' })
      useHarmonyStore.setState({
        notePositions: g().melody.map((n, i) => ({ id: n.id, x: 60 + i * 100 })),
      })
    })
    const { result } = renderHook(() => useScoreDragAndDrop())
    act(() => result.current.handleDragEnd({
      active: { data: { current: { type: 'note', pitch: 'D4', duration: 'h' } } },
      over: overCanvas, ...at(110, 44),
    }))
    expect(g().melody.map((n) => n.pitch)).toEqual(['C4', 'D4', 'E4'])
    expect(g().melody[1].duration).toBe('h')
  })

  it('replaces the note under the drop point (within the 14px hit radius)', () => {
    act(() => {
      g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
      useHarmonyStore.setState({ notePositions: [{ id: g().melody[0].id, x: 100 }] })
    })
    const { result } = renderHook(() => useScoreDragAndDrop())
    act(() => result.current.handleDragEnd({
      active: { data: { current: { type: 'note', pitch: 'A5', duration: '8' } } },
      over: overCanvas, ...at(110, 44),
    }))
    expect(g().melody).toHaveLength(1)
    expect(g().melody[0]).toMatchObject({ pitch: 'A5', duration: '8' })
  })

  it('repositions an existing note by X and repitches by Y', () => {
    act(() => {
      g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
      g().addNoteAt({ type: 'note', pitch: 'E4', duration: 'q' })
      useHarmonyStore.setState({
        notePositions: g().melody.map((n, i) => ({ id: n.id, x: 60 + i * 100 })),
      })
    })
    const first = g().melody[0].id
    const { result } = renderHook(() => useScoreDragAndDrop())
    // STAFF_TOP_OFFSET=44; clientY 84 → 40px below the top line → slot 4 → B4
    act(() => result.current.handleDragEnd({
      active: { data: { current: { kind: 'reposition', noteId: first } } },
      over: overCanvas, ...at(300, 84),
    }))
    expect(g().melody.map((n) => n.pitch)).toEqual(['E4', 'B4'])
  })

  it('does nothing when dropped outside the score', () => {
    act(() => g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' }))
    const { result } = renderHook(() => useScoreDragAndDrop())
    act(() => result.current.handleDragEnd({
      active: { data: { current: { type: 'note', pitch: 'D4', duration: 'q' } } },
      over: null, ...at(100, 44),
    }))
    expect(g().melody).toHaveLength(1)
  })
})

describe('usePlaybackController', () => {
  let clickSpy
  let downloads

  beforeEach(() => {
    downloads = []
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function () { downloads.push(this.download) })
  })

  afterEach(() => {
    clickSpy.mockRestore()
  })

  it('play with no tracks returns a controlled failure and never throws', async () => {
    const { result } = renderHook(() => usePlaybackController())
    let res
    await act(async () => { res = await result.current.play() })
    expect(res.ok).toBe(false)
    expect(g().isPlaying).toBe(false)
    expect(loadAudioEngine).not.toHaveBeenCalled()
  })

  it('play loads the engine lazily and schedules the enabled tracks', async () => {
    const play = vi.fn()
    loadAudioEngine.mockResolvedValue({ play })
    act(() => g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' }))
    const { result } = renderHook(() => usePlaybackController())
    let res
    await act(async () => { res = await result.current.play() })
    expect(res.ok).toBe(true)
    expect(g().isPlaying).toBe(true)
    const [tracks, bpm] = play.mock.calls[0]
    expect(tracks.map((t) => t.id)).toEqual(['melody'])
    expect(bpm).toBe(90)
  })

  it('a failed engine load resolves {ok:false} and resets isPlaying', async () => {
    loadAudioEngine.mockRejectedValue(new Error('offline'))
    act(() => g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' }))
    const { result } = renderHook(() => usePlaybackController())
    let res
    await act(async () => { res = await result.current.play() })
    expect(res).toMatchObject({ ok: false })
    expect(g().isPlaying).toBe(false)
  })

  it('stop always resets isPlaying', async () => {
    stopPlayback.mockResolvedValue()
    act(() => g().setIsPlaying(true))
    const { result } = renderHook(() => usePlaybackController())
    await act(async () => { await result.current.stop() })
    expect(g().isPlaying).toBe(false)
  })

  it('download names the file from the project title and manages the object URL', async () => {
    loadAudioEngine.mockResolvedValue({
      renderWav: vi.fn().mockResolvedValue(new Blob(['x'], { type: 'audio/wav' })),
    })
    act(() => {
      g().setProjectInfo({ title: 'My Song' })
      g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
    })
    const { result } = renderHook(() => usePlaybackController())
    let res
    await act(async () => { res = await result.current.download('wav') })
    expect(res.ok).toBe(true)
    expect(downloads).toEqual(['My Song.wav'])
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('exportPdf passes ordered score ids and the title to the lazy exporter', async () => {
    const exportToPDF = vi.fn().mockResolvedValue()
    loadPdfExporter.mockResolvedValue({ exportToPDF })
    act(() => {
      g().setProjectInfo({ title: 'Score' })
      useHarmonyStore.setState({
        importedLines: [{ id: 'A', notes: [] }],
        derivedLines: [{ id: 'B', type: '3rd_harmony', notes: [] }],
      })
    })
    const { result } = renderHook(() => usePlaybackController())
    await act(async () => { await result.current.exportPdf() })
    expect(exportToPDF).toHaveBeenCalledWith(
      ['melody_line', 'imported_line_A', 'derived_line_B'], 'Score'
    )
  })

  it('a rejected export resolves {ok:false} without an unhandled rejection', async () => {
    loadPdfExporter.mockRejectedValue(new Error('no pdf'))
    const { result } = renderHook(() => usePlaybackController())
    let res
    await act(async () => { res = await result.current.exportPdf() })
    expect(res).toMatchObject({ ok: false })
  })
})

describe('pure track/id builders', () => {
  it('buildEnabledTracks respects mute flags across all line kinds', () => {
    const s = {
      melody: [{ id: 'm1' }],
      importedLines: [{ id: 'i1', notes: [] }, { id: 'i2', notes: [] }],
      derivedLines: [{ id: 'd1', notes: [] }],
      enabledTracks: { melody: true, i1: false },
    }
    expect(buildEnabledTracks(s).map((t) => t.id)).toEqual(['melody', 'i2', 'd1'])
  })

  it('buildExportIds keeps melody first, then imported, then derived', () => {
    expect(buildExportIds({
      importedLines: [{ id: 'x' }],
      derivedLines: [{ id: 'y' }],
    })).toEqual(['melody_line', 'imported_line_x', 'derived_line_y'])
  })
})
