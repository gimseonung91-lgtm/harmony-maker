import { describe, it, expect } from 'vitest'
import { collectBeamNoteGroups, isBeamableDuration } from '../../src/domain/beams'

describe('beam grouping', () => {
  const tickables = ['A', 'B', 'C', 'D', 'E']

  it('groups consecutive explicitly connected eighth and sixteenth notes', () => {
    const notes = [
      { type: 'note', duration: '8', beam: true },
      { type: 'note', duration: '16', beam: true },
      { type: 'note', duration: '8', beam: false },
      { type: 'note', duration: 'q', beam: true },
      { type: 'note', duration: '8', beam: false },
    ]

    expect(collectBeamNoteGroups(notes, tickables)).toEqual([['A', 'B', 'C']])
  })

  it('breaks beam groups at rests, unbeamable durations, and missing next notes', () => {
    const notes = [
      { type: 'note', duration: '8', beam: true },
      { type: 'rest', duration: '8', beam: true },
      { type: 'note', duration: '8', beam: true },
      { type: 'note', duration: 'q', beam: true },
      { type: 'note', duration: '16', beam: true },
    ]

    expect(collectBeamNoteGroups(notes, tickables)).toEqual([])
  })

  it('treats only eighth-family and sixteenth-family notes as beamable', () => {
    expect(isBeamableDuration('8')).toBe(true)
    expect(isBeamableDuration('8d')).toBe(true)
    expect(isBeamableDuration('16')).toBe(true)
    expect(isBeamableDuration('16d')).toBe(true)
    expect(isBeamableDuration('q')).toBe(false)
    expect(isBeamableDuration('qd')).toBe(false)
  })
})
