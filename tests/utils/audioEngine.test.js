// Characterization: note → scheduled-event conversion (current contract).
// Only the pure scheduling function is exercised; Tone playback is not.
import { describe, it, expect, vi } from 'vitest'

vi.mock('tone', () => ({})) // audioEngine imports Tone at module top; block it

const { notesToEvents } = await import('../../src/utils/audioEngine')

const note = (pitch, duration, tie = false) => ({ type: 'note', pitch, duration, tie })
const rest = (duration) => ({ type: 'rest', pitch: null, duration })

describe('notesToEvents', () => {
  it('accumulates beats per duration (w=4, h=2, q=1, 8=0.5, 16=0.25)', () => {
    const { events, totalBeats } = notesToEvents([
      note('C4', 'w'), note('D4', 'h'), note('E4', 'q'), note('F4', '8'), note('G4', '16'),
    ])
    expect(events.map((e) => e.time)).toEqual([0, 4, 6, 7, 7.5])
    expect(events.map((e) => e.duration)).toEqual([4, 2, 1, 0.5, 0.25])
    expect(totalBeats).toBe(7.75)
  })

  it('advances time silently over rests', () => {
    const { events, totalBeats } = notesToEvents([note('C4', 'q'), rest('q'), note('D4', 'q')])
    expect(events).toHaveLength(2)
    expect(events[1].time).toBe(2)
    expect(totalBeats).toBe(3)
  })

  it('merges tied chains into one event', () => {
    const { events, totalBeats } = notesToEvents([
      note('C4', 'q', true), note('C4', 'h'), note('D4', 'q'),
    ])
    expect(events).toHaveLength(2)
    expect(events[0].duration).toBe(3)
    expect(events[1].time).toBe(3)
    expect(totalBeats).toBe(4)
  })

  it('does not merge a tie into a following rest', () => {
    const { events } = notesToEvents([note('C4', 'q', true), rest('q'), note('D4', 'q')])
    expect(events[0].duration).toBe(1)
    expect(events[1].time).toBe(2)
  })

  it('falls back to quarter for unknown durations', () => {
    const { events, totalBeats } = notesToEvents([note('C4', 'bogus'), note('D4', 'q')])
    expect(events[0].duration).toBe(1)
    expect(totalBeats).toBe(2)
  })

  it('passes pitches through unchanged for Tone', () => {
    const { events } = notesToEvents([note('F#4', 'q'), note('Bb4', 'q')])
    expect(events.map((e) => e.note)).toEqual(['F#4', 'Bb4'])
  })
})
