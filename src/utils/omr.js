// Optical Music Recognition (OMR) — sheet-music image → note data.
//
// When an oemer backend is configured (VITE_OMR_BACKEND_URL), the image is sent
// there, oemer returns MusicXML, and we parse it with the shared MusicXML
// parser. Without a backend, a representative sample line is returned so the UI
// flow still works.

import { parseMusicXML } from './musicxml'

const BACKEND_URL = import.meta.env.VITE_OMR_BACKEND_URL || ''

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

/**
 * Analyze a sheet-music image and return its lines (staff systems).
 *
 * @param {File} file – the uploaded image
 * @returns {Promise<{ lines: Array<{lineId:string, notes:Array}>, usedBackend: boolean }>}
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
      const detail = await res.text().catch(() => '')
      throw new Error(`OMR backend error (${res.status}). ${detail.slice(0, 200)}`)
    }
    const xml = await res.text()
    return { lines: parseMusicXML(xml), usedBackend: true }
  }

  // No backend configured → sample line so the pipeline is still exercisable.
  await new Promise((r) => setTimeout(r, 400))
  return { lines: SAMPLE_LINES, usedBackend: false }
}
