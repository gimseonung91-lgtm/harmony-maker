// Characterization: store editor actions, undo, lines, harmony (current contract).
import { describe, it, expect, beforeEach } from 'vitest'
import { useHarmonyStore } from '../../src/store/useHarmonyStore'

const g = () => useHarmonyStore.getState()

const FRESH = {
  projectInfo: { title: 'Untitled', keySignature: 'C', clef: 'treble', timeSignature: '4/4' },
  melody: [],
  derivedLines: [],
  importedLines: [],
  enabledTracks: { melody: true },
  isPlaying: false,
  bpm: 90,
  notePositions: [],
  selectedNoteId: null,
  toolbarOpen: true,
  activeCategory: 'notes',
  selectedDuration: 'q',
  _undo: [],
}

beforeEach(() => {
  useHarmonyStore.setState({ ...FRESH })
})

describe('melody editing', () => {
  it('addNoteAt appends by default and inserts at a clamped index', () => {
    g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
    g().addNoteAt({ type: 'note', pitch: 'E4', duration: 'q' })
    g().addNoteAt({ type: 'note', pitch: 'D4', duration: 'q' }, 1)
    g().addNoteAt({ type: 'note', pitch: 'F4', duration: 'q' }, 99) // clamped to end
    expect(g().melody.map((n) => n.pitch)).toEqual(['C4', 'D4', 'E4', 'F4'])
    const n = g().melody[0]
    expect(n).toMatchObject({ type: 'note', duration: 'q', tie: false, lyric: '' })
    expect(n.id).toMatch(/^note_/)
  })

  it('moveNote reorders and optionally repitches (rests keep null pitch)', () => {
    g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
    g().addNoteAt({ type: 'rest', pitch: null, duration: 'q' })
    g().addNoteAt({ type: 'note', pitch: 'E4', duration: 'q' })
    const [c4, r, e4] = g().melody
    g().moveNote(e4.id, 0, 'G4')
    expect(g().melody.map((n) => n.pitch)).toEqual(['G4', 'C4', null])
    g().moveNote(r.id, 0, 'A4') // pitch ignored for rests
    expect(g().melody[0].pitch).toBeNull()
    g().moveNote('missing-id', 0, 'B4') // no-op
    expect(g().melody).toHaveLength(3)
  })

  it('replaceNote overwrites pitch/duration in place, keeps lyric, converts to rest', () => {
    g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
    const id = g().melody[0].id
    g().setLyric(id, '라')
    g().replaceNote(id, { type: 'note', pitch: 'G5', duration: 'h' })
    expect(g().melody[0]).toMatchObject({ pitch: 'G5', duration: 'h', lyric: '라' })
    g().replaceNote(id, { type: 'rest', duration: 'q' })
    expect(g().melody[0]).toMatchObject({ type: 'rest', pitch: null, duration: 'q' })
    g().replaceNote('missing-id', { pitch: 'A4' }) // no-op
    expect(g().melody).toHaveLength(1)
  })

  it('setNoteDuration, toggleTie, toggleBeam, removeNote target one note by id', () => {
    g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
    g().addNoteAt({ type: 'note', pitch: 'D4', duration: 'q' })
    const [a, b] = g().melody
    g().toggleTie(a.id)
    g().toggleBeam(a.id)
    expect(g().melody[0]).toMatchObject({ duration: 'q', tie: true, beam: false })
    g().setNoteDuration(a.id, '8')
    g().toggleBeam(a.id)
    expect(g().melody[0]).toMatchObject({ duration: '8', tie: true, beam: true })
    g().setNoteDuration(a.id, 'h')
    expect(g().melody[0]).toMatchObject({ duration: 'h', tie: true, beam: false })
    expect(g().melody[1]).toMatchObject({ duration: 'q', tie: false, beam: false })
    g().selectNote(b.id)
    g().removeNote(b.id)
    expect(g().melody).toHaveLength(1)
    expect(g().selectedNoteId).toBeNull()
  })
})

describe('undo', () => {
  it('restores melody snapshots step by step and caps at 50', () => {
    g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
    g().addNoteAt({ type: 'note', pitch: 'D4', duration: 'q' })
    g().undo()
    expect(g().melody.map((n) => n.pitch)).toEqual(['C4'])
    g().undo()
    expect(g().melody).toEqual([])
    g().undo() // empty stack: no-op
    expect(g().melody).toEqual([])

    for (let i = 0; i < 60; i++) g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
    expect(g()._undo.length).toBe(50)
  })
})

describe('harmony lines', () => {
  it('generateHarmony maps melody diatonically, falls back to melody pitch, reuses line id', () => {
    g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
    g().addNoteAt({ type: 'rest', pitch: null, duration: '8' })
    g().generateHarmony('3rd')
    const line = g().derivedLines[0]
    expect(line.type).toBe('3rd_harmony')
    expect(line.notes[0]).toMatchObject({ pitch: 'E4', duration: 'q' })
    expect(line.notes[1]).toMatchObject({ type: 'rest', duration: '8' })
    expect(g().enabledTracks[line.id]).toBe(true)

    g().generateHarmony('3rd') // regenerating replaces, keeps id
    expect(g().derivedLines).toHaveLength(1)
    expect(g().derivedLines[0].id).toBe(line.id)

    g().generateHarmony('5th') // 3rd sorts before 5th
    expect(g().derivedLines.map((l) => l.type)).toEqual(['3rd_harmony', '5th_harmony'])

    g().removeDerivedLine(line.id)
    expect(g().derivedLines.map((l) => l.type)).toEqual(['5th_harmony'])
    expect(g().enabledTracks[line.id]).toBeUndefined()
  })
})

describe('imported lines', () => {
  const twoMeasures = [
    { type: 'note', pitch: 'A4', duration: 'q', measure: 0 },
    { type: 'note', pitch: 'B4', duration: 'q', measure: 1 },
  ]

  it('setImportedLines assigns fresh ids and enables tracks', () => {
    g().setImportedLines([{ lineId: 'x', notes: twoMeasures }])
    const line = g().importedLines[0]
    expect(line.id).toMatch(/^imp_/)
    expect(g().enabledTracks[line.id]).toBe(true)
  })

  it('splitLine explodes one line per measure; single-measure lines are untouched', () => {
    g().setImportedLines([{ lineId: 'x', notes: twoMeasures }])
    const id = g().importedLines[0].id
    g().splitLine(id)
    expect(g().importedLines).toHaveLength(2)
    expect(g().enabledTracks[id]).toBeUndefined()
    const firstId = g().importedLines[0].id
    g().splitLine(firstId) // one measure → no-op
    expect(g().importedLines).toHaveLength(2)
  })

  it('moveLine swaps neighbours and ignores out-of-range moves', () => {
    g().setImportedLines([
      { lineId: 'a', notes: [twoMeasures[0]] },
      { lineId: 'b', notes: [twoMeasures[1]] },
    ])
    const [l1, l2] = g().importedLines
    g().moveLine(l1.id, 'up') // already first: no-op
    expect(g().importedLines[0].id).toBe(l1.id)
    g().moveLine(l1.id, 'down')
    expect(g().importedLines.map((l) => l.id)).toEqual([l2.id, l1.id])
  })

  it('editImportedLine copies the line into melody with fresh note ids', () => {
    g().setImportedLines([{ lineId: 'x', notes: twoMeasures }])
    g().editImportedLine(g().importedLines[0].id)
    expect(g().melody.map((n) => n.pitch)).toEqual(['A4', 'B4'])
    expect(g().melody[0].id).toMatch(/^note_/)
    expect(g().importedLines).toHaveLength(1) // source line kept
  })

  it('removeLine drops the line and its track entry', () => {
    g().setImportedLines([{ lineId: 'x', notes: twoMeasures }])
    const id = g().importedLines[0].id
    g().removeLine(id)
    expect(g().importedLines).toEqual([])
    expect(g().enabledTracks[id]).toBeUndefined()
  })
})

describe('playback/ui state', () => {
  it('toggleTrack flips (default-on) tracks; clearAll resets content but keeps project info', () => {
    g().toggleTrack('melody')
    expect(g().enabledTracks.melody).toBe(false)
    g().toggleTrack('melody')
    expect(g().enabledTracks.melody).toBe(true)

    g().setProjectInfo({ title: 'Song' })
    g().addNoteAt({ type: 'note', pitch: 'C4', duration: 'q' })
    g().generateHarmony('3rd')
    g().clearAll()
    expect(g().melody).toEqual([])
    expect(g().derivedLines).toEqual([])
    expect(g().importedLines).toEqual([])
    expect(g().enabledTracks).toEqual({ melody: true })
    expect(g().projectInfo.title).toBe('Song')
  })
})
