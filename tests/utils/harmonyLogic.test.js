// Characterization: diatonic harmony computation (current contract).
import { describe, it, expect } from 'vitest'
import { computeHarmony, harmonize } from '../../src/utils/harmonyLogic'

describe('computeHarmony', () => {
  it('returns diatonic third and fifth in C major', () => {
    expect(computeHarmony('C4', 'C')).toEqual(['E4', 'G4'])
    expect(computeHarmony('D4', 'C')).toEqual(['F4', 'A4'])
  })

  it('wraps the octave when the harmony pitch is chromatically lower', () => {
    // 3rd above B4 in C major is D — one octave up
    expect(computeHarmony('B4', 'C')).toEqual(['D5', 'F5'])
    expect(computeHarmony('A4', 'C')).toEqual(['C5', 'E5'])
  })

  it('spells harmony with flats in flat keys', () => {
    // In F major the 3rd above G is Bb (not A#)
    expect(computeHarmony('G4', 'F')).toEqual(['Bb4', 'D5'])
    expect(computeHarmony('F4', 'F')).toEqual(['A4', 'C5'])
  })

  it('accepts flat-named input pitches', () => {
    expect(computeHarmony('Bb4', 'F')).toEqual(['D5', 'F5'])
  })

  it('returns [null, null] for non-diatonic or unparseable pitches', () => {
    expect(computeHarmony('C#4', 'C')).toEqual([null, null])
    expect(computeHarmony('not-a-pitch', 'C')).toEqual([null, null])
  })
})

describe('harmonize', () => {
  it('selects the requested interval', () => {
    expect(harmonize('C4', 'C', '3rd')).toBe('E4')
    expect(harmonize('C4', 'C', '5th')).toBe('G4')
  })

  it('returns null for non-diatonic input', () => {
    expect(harmonize('F#4', 'C', '3rd')).toBeNull()
  })
})
