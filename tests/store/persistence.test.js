// Characterization: localStorage autosave (current contract).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const STORAGE_KEY = 'harmony-maker-project-v1'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  vi.resetModules()
})

describe('autosave', () => {
  it('writes the persisted projection (debounced) after a store change', async () => {
    localStorage.clear()
    vi.resetModules()
    const { useHarmonyStore } = await import('../../src/store/useHarmonyStore')
    useHarmonyStore.getState().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
    useHarmonyStore.getState().setBpm(120)
    vi.advanceTimersByTime(600)

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(Object.keys(saved).sort()).toEqual(
      ['bpm', 'derivedLines', 'enabledTracks', 'importedLines', 'melody', 'projectInfo'].sort()
    )
    expect(saved.melody).toHaveLength(1)
    expect(saved.bpm).toBe(120)
    // transient state is never persisted
    expect(saved.selectedNoteId).toBeUndefined()
    expect(saved._undo).toBeUndefined()
    expect(saved.notePositions).toBeUndefined()
  })

  it('restores a saved project on load', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projectInfo: { title: 'Saved', keySignature: 'F', clef: 'treble', timeSignature: '3/4' },
      melody: [{ id: 'n1', type: 'note', pitch: 'A4', duration: 'h', tie: false, lyric: '' }],
      derivedLines: [],
      importedLines: [],
      enabledTracks: { melody: false },
      bpm: 77,
    }))
    vi.resetModules()
    const { useHarmonyStore } = await import('../../src/store/useHarmonyStore')
    const s = useHarmonyStore.getState()
    expect(s.projectInfo.title).toBe('Saved')
    expect(s.projectInfo.timeSignature).toBe('3/4')
    expect(s.melody[0].pitch).toBe('A4')
    expect(s.enabledTracks.melody).toBe(false)
    expect(s.bpm).toBe(77)
  })

  it('survives corrupt storage and starts fresh', async () => {
    localStorage.setItem(STORAGE_KEY, '{corrupt json!!')
    vi.resetModules()
    const { useHarmonyStore } = await import('../../src/store/useHarmonyStore')
    const s = useHarmonyStore.getState()
    expect(s.melody).toEqual([])
    expect(s.bpm).toBe(90)
    expect(s.projectInfo.keySignature).toBe('C')
  })
})
