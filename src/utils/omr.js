// Optical Music Recognition (OMR) — sheet-music image → note data.
//
// When an oemer backend is configured (VITE_OMR_BACKEND_URL), the image is sent
// there, oemer returns MusicXML, and we parse it with the shared MusicXML
// parser. Without a backend, a representative sample line is returned so the UI
// flow still works.

import { parseMusicXML } from './musicxml'

const BACKEND_URL = import.meta.env.VITE_OMR_BACKEND_URL || ''
const LOW_CONFIDENCE_MIN_LINES = 2
const LOW_CONFIDENCE_MIN_NOTES = 8
const RHYTHMIC_EVIDENCE = /<lyric\b|<beam\b|<type>\s*(eighth|16th|32nd|64th)\s*<\/type>|<dot\b|<tie\b|<tied\b/i

export function hasOmrBackend() {
  return Boolean(BACKEND_URL)
}

// Sample fallback used when no backend is configured (one line).
const SAMPLE_LINES = [
  {
    lineId: 'line_1',
    notes: [
      { type: 'note', pitch: 'C4', duration: 'q', measure: 0 },
      { type: 'note', pitch: 'E4', duration: '8', measure: 0 },
      { type: 'note', pitch: 'G4', duration: '8', measure: 0 },
      { type: 'rest', pitch: null, duration: 'q', measure: 0 },
      { type: 'note', pitch: 'A4', duration: 'q', measure: 0 },
    ],
  },
]

function countNotes(lines) {
  return lines.reduce((total, line) => total + line.notes.length, 0)
}

function hasParsedRhythmicEvidence(lines) {
  return lines.some((line) => line.notes.some((note) => (
    note.beam || note.tie || note.duration === '8' || note.duration === '8d'
    || note.duration === '16' || note.duration === '16d'
  )))
}

export function assertUsableOmrResult(lines, xmlText) {
  const enoughContentToJudge = lines.length >= LOW_CONFIDENCE_MIN_LINES
    && countNotes(lines) >= LOW_CONFIDENCE_MIN_NOTES
  const hasMusicXmlEvidence = RHYTHMIC_EVIDENCE.test(xmlText)
  if (enoughContentToJudge && !hasMusicXmlEvidence && !hasParsedRhythmicEvidence(lines)) {
    throw new Error(
      '인식 결과의 신뢰도가 낮아 악보에 넣지 않았습니다. 보컬 오선만 잘라서 다시 업로드하거나, 가능하면 원본 MusicXML을 업로드해 주세요.'
    )
  }
}

/**
 * Analyze a sheet-music image and return its lines (staff systems).
 *
 * @param {File} file – the uploaded image
 * @returns {Promise<{ lines: Array<{lineId:string, notes:Array}>, meta: object, usedBackend: boolean }>}
 */
export async function analyzeScoreImage(file) {
  if (BACKEND_URL) {
    const form = new FormData()
    form.append('file', file)

    const res = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/omr`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      const raw = await res.text().catch(() => '')
      // FastAPI wraps error messages as {"detail": "..."} — unwrap for display
      let detail = raw
      try { detail = JSON.parse(raw).detail ?? raw } catch { /* not JSON */ }
      throw new Error(`${String(detail).slice(0, 300)} (OMR 백엔드 ${res.status})`)
    }
    const xml = await res.text()
    const { lines, meta } = parseMusicXML(xml)
    assertUsableOmrResult(lines, xml)
    return { lines, meta, usedBackend: true }
  }

  // No backend configured → sample line so the pipeline is still exercisable.
  await new Promise((r) => setTimeout(r, 400))
  return { lines: SAMPLE_LINES, meta: {}, usedBackend: false }
}
