// Lazy boundary for the audio stack. Tone.js (~700 kB raw) loads only when
// the user actually plays or exports audio — never in the eager entry graph.

let enginePromise = null

/** Load (once) and return the audio engine module. */
export function loadAudioEngine() {
  if (!enginePromise) enginePromise = import('../utils/audioEngine')
  return enginePromise
}

/** Stop playback if the engine was ever loaded; otherwise nothing plays. */
export async function stopPlayback() {
  if (!enginePromise) return
  const engine = await enginePromise
  engine.stop()
}
