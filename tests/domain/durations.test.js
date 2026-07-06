import { describe, it, expect } from 'vitest'
import {
  DURATION_ENTRIES, DURATIONS, RESTS, SHORTCUT_TO_DURATION, getDuration, beatsOf,
} from '../../src/domain/durations'

describe('duration registry', () => {
  it('contains exactly the six entries in notation order', () => {
    expect(DURATION_ENTRIES.map((e) => e.id)).toEqual(['w', 'h', 'q', 'qd', '8', '16'])
    expect(DURATIONS).toBe(DURATION_ENTRIES)
  })

  it('defines beats, VexFlow and Tone codes for every entry', () => {
    const byId = Object.fromEntries(DURATION_ENTRIES.map((e) => [e.id, e]))
    expect(byId.w).toMatchObject({ beats: 4, vex: 'w', vexDots: 0, tone: '1n' })
    expect(byId.h).toMatchObject({ beats: 2, vex: 'h', vexDots: 0, tone: '2n' })
    expect(byId.q).toMatchObject({ beats: 1, vex: 'q', vexDots: 0, tone: '4n' })
    expect(byId.qd).toMatchObject({ beats: 1.5, vex: 'q', vexDots: 1, tone: '4n.' })
    expect(byId['8']).toMatchObject({ beats: 0.5, vex: '8', vexDots: 0, tone: '8n' })
    expect(byId['16']).toMatchObject({ beats: 0.25, vex: '16', vexDots: 0, tone: '16n' })
  })

  it('keeps the rest palette at exactly w, h, q, 8, 16 (qd hidden)', () => {
    expect(RESTS.map((r) => r.id)).toEqual(['w', 'h', 'q', '8', '16'])
    RESTS.forEach((r) => {
      expect(r.label).toBeTruthy()
      expect(r.symbol).toBeTruthy()
    })
  })

  it('maps keyboard shortcuts 1-6 (6 = dotted quarter)', () => {
    expect(SHORTCUT_TO_DURATION).toEqual({
      1: 'w', 2: 'h', 3: 'q', 4: '8', 5: '16', 6: 'qd',
    })
  })

  it('normalizes unknown/null/malformed ids to quarter for every consumer', () => {
    for (const bad of ['bogus', null, undefined, 42, '', {}]) {
      expect(getDuration(bad).id).toBe('q')
      expect(beatsOf(bad)).toBe(1)
    }
  })

  it('is immutable', () => {
    expect(() => { DURATION_ENTRIES[0].beats = 99 }).toThrow()
    expect(() => { RESTS.push({}) }).toThrow()
  })
})
