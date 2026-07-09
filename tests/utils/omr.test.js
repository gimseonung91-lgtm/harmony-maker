import { describe, expect, it } from 'vitest'
import { assertUsableOmrResult } from '../../src/utils/omr'

const makeLine = (lineId, count, duration = 'q') => ({
  lineId,
  notes: Array.from({ length: count }, (_, measure) => ({
    type: 'note',
    pitch: 'Bb4',
    duration,
    tie: false,
    beam: false,
    measure,
  })),
})

describe('OMR result quality gate', () => {
  it('rejects multi-line image OMR output with no rhythmic or vocal evidence', () => {
    const lines = [
      makeLine('line_1', 9),
      makeLine('line_2', 11),
      makeLine('line_3', 8),
    ]
    const xml = '<score-partwise><part><measure><note><type>quarter</type></note></measure></part></score-partwise>'

    expect(() => assertUsableOmrResult(lines, xml)).toThrow(/인식 결과의 신뢰도가 낮아/)
  })

  it('accepts image OMR output when MusicXML contains vocal or rhythmic evidence', () => {
    const lines = [
      makeLine('line_1', 6, '8'),
      makeLine('line_2', 5, '8'),
    ]
    const xml = `
<score-partwise><part><measure>
  <note><pitch><step>C</step><octave>4</octave></pitch><type>eighth</type><beam>begin</beam></note>
  <note><pitch><step>D</step><octave>4</octave></pitch><type>eighth</type><beam>end</beam><lyric><text>꿈</text></lyric></note>
</measure></part></score-partwise>`

    expect(() => assertUsableOmrResult(lines, xml)).not.toThrow()
  })
})
