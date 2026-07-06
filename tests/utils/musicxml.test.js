// Characterization: MusicXML parsing (current contract).
import { describe, it, expect } from 'vitest'
import { parseMusicXML } from '../../src/utils/musicxml'

const NOTE = (step, octave, type, extra = '') => `
  <note>${extra}<pitch><step>${step}</step><octave>${octave}</octave></pitch>
  <type>${type}</type></note>`

const wrap = (measures) => `<?xml version="1.0"?>
<score-partwise><part id="P1">${measures}</part></score-partwise>`

describe('parseMusicXML', () => {
  it('parses notes, rests, alter accidentals, ties and chord skipping', () => {
    const xml = wrap(`
      <measure number="1">
        <attributes><key><fifths>-1</fifths></key>
        <time><beats>3</beats><beat-type>4</beat-type></time></attributes>
        <note><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><type>quarter</type></note>
        <note><rest/><type>half</type></note>
        <note><pitch><step>C</step><alter>1</alter><octave>5</octave></pitch><type>eighth</type>
          <tie type="start"/></note>
        <note><chord/><pitch><step>E</step><octave>5</octave></pitch><type>eighth</type></note>
      </measure>`)
    const { lines, meta } = parseMusicXML(xml)
    expect(meta).toEqual({ keySignature: 'F', timeSignature: '3/4' })
    const notes = lines[0].notes
    expect(notes).toHaveLength(3) // chord member skipped
    expect(notes[0]).toMatchObject({ pitch: 'Bb4', duration: 'q', measure: 0 })
    expect(notes[1]).toMatchObject({ type: 'rest', duration: 'h' })
    expect(notes[2]).toMatchObject({ pitch: 'C#5', duration: '8', tie: true })
  })

  it('splits lines on new-system markers when present', () => {
    const xml = wrap(`
      <measure number="1">${NOTE('C', 4, 'quarter')}</measure>
      <measure number="2"><print new-system="yes"/>${NOTE('D', 4, 'quarter')}</measure>`)
    const { lines } = parseMusicXML(xml)
    expect(lines).toHaveLength(2)
    expect(lines.map((l) => l.lineId)).toEqual(['line_1', 'line_2'])
  })

  it('falls back to 4 measures per line without system markers', () => {
    const measures = Array.from({ length: 6 }, (_, i) =>
      `<measure number="${i + 1}">${NOTE('C', 4, 'quarter')}</measure>`).join('')
    const { lines } = parseMusicXML(wrap(measures))
    expect(lines).toHaveLength(2)
    expect(lines[0].notes).toHaveLength(4)
    expect(lines[1].notes).toHaveLength(2)
  })

  it('maps unknown <type> to quarter and clamps exotic types', () => {
    const xml = wrap(`<measure number="1">
      ${NOTE('C', 4, 'mystery')}${NOTE('D', 4, '32nd')}${NOTE('E', 4, 'breve')}
    </measure>`)
    const { lines } = parseMusicXML(xml)
    expect(lines[0].notes.map((n) => n.duration)).toEqual(['q', '16', 'w'])
  })

  it('throws on unparseable XML, missing part, and empty scores', () => {
    expect(() => parseMusicXML('not xml <<<')).toThrow(/Invalid MusicXML/)
    expect(() => parseMusicXML('<?xml version="1.0"?><score-partwise/>')).toThrow(/No <part>/)
    expect(() => parseMusicXML(wrap('<measure number="1"></measure>'))).toThrow(/No notes/)
  })
})
