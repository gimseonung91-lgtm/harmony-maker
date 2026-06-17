// Optical Music Recognition (OMR) — sheet-music image → note data
//
// The note-extraction step is designed to be powered by Claude's Vision API.
// That call is left as a clearly-marked integration point because it requires a
// paid Anthropic API key. Until a key is wired in, `analyzeScoreImage` returns a
// representative sample line so the full upload → parse → render pipeline works
// end-to-end.

/**
 * Read a File as a base64 data URL (used both for preview and for the API call).
 */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Sample fallback: a one-bar C-major line used until the Vision API is connected.
const SAMPLE_LINE = [
  { type: 'note', pitch: 'C4', duration: 'q' },
  { type: 'note', pitch: 'E4', duration: '8' },
  { type: 'note', pitch: 'G4', duration: '8' },
  { type: 'rest', pitch: null, duration: 'q' },
  { type: 'note', pitch: 'A4', duration: 'q' },
]

/**
 * Analyze a sheet-music image and return a single line of note data.
 *
 * @param {File} file – the uploaded image
 * @returns {Promise<Array<{type:'note'|'rest', pitch:string|null, duration:string}>>}
 */
export async function analyzeScoreImage(file) {
  const dataURL = await fileToDataURL(file)

  // ─── Claude Vision integration point ──────────────────────────────
  // To enable real OMR, POST the image to the Anthropic Messages API with a
  // model such as claude-sonnet-4-6, asking it to return strict JSON shaped like
  // SAMPLE_LINE. Requires a paid API key (do NOT ship the key in the browser —
  // proxy through a small backend endpoint).
  //
  //   const res = await fetch('/api/omr', { method: 'POST', body: JSON.stringify({ image: dataURL }) })
  //   const { notes } = await res.json()
  //   return notes
  //
  // Until that endpoint exists we resolve with a sample line so the UI flow is
  // fully exercisable.
  void dataURL
  await new Promise((r) => setTimeout(r, 600)) // simulate analysis latency
  return SAMPLE_LINE
}
