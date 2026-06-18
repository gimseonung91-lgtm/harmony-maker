import * as Tone from 'tone'

// VexFlow duration id → Tone.js notation + beats (quarter = 1 beat)
const DURATION_MAP = {
  w:  { notation: '1n',  beats: 4 },
  h:  { notation: '2n',  beats: 2 },
  q:  { notation: '4n',  beats: 1 },
  '8':  { notation: '8n',  beats: 0.5 },
  '16': { notation: '16n', beats: 0.25 },
}

// Our pitch "C4" / "F#4" is already valid Tone.js note format, but VexFlow uses
// lowercase + slash. Our store keeps "C4" style, so pass through directly.
function toToneNote(pitch) {
  return pitch // e.g. "C4", "F#4" — accepted by Tone.js
}

/**
 * Convert a line of notes into scheduled audio events.
 * Walks the notes accumulating time; rests advance time silently; tied notes
 * merge their duration into the preceding sounding note.
 *
 * @returns {{ events: Array<{time:number, note:string, duration:string}>, totalBeats:number }}
 */
export function notesToEvents(notes) {
  const events = []
  let beat = 0
  let i = 0

  while (i < notes.length) {
    const n = notes[i]
    const map = DURATION_MAP[n.duration] ?? DURATION_MAP.q

    if (n.type === 'rest' || !n.pitch) {
      beat += map.beats
      i += 1
      continue
    }

    // Accumulate this note's beats, extending across any tied chain
    let beats = map.beats
    let j = i
    while (notes[j]?.tie && notes[j + 1] && notes[j + 1].type !== 'rest') {
      const nextMap = DURATION_MAP[notes[j + 1].duration] ?? DURATION_MAP.q
      beats += nextMap.beats
      j += 1
    }

    events.push({
      time: beat,                 // in beats; converted to transport time below
      note: toToneNote(n.pitch),
      duration: beats,            // in beats
    })

    beat += beats
    i = j + 1
  }

  return { events, totalBeats: beat }
}

// All synths route through a master gain so we can tap it for recording.
let masterGain = null
function getMaster() {
  if (!masterGain) masterGain = new Tone.Gain(1).toDestination()
  return masterGain
}

// One synth per track id, lazily created and reused.
const synths = new Map()
const parts = []
let stopEventId = null

function getSynth(trackId) {
  if (!synths.has(trackId)) {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.6 },
    }).connect(getMaster())
    synth.volume.value = -8
    synths.set(trackId, synth)
  }
  return synths.get(trackId)
}

function disposeParts() {
  parts.forEach((p) => p.dispose())
  parts.length = 0
  if (stopEventId !== null) {
    Tone.Transport.clear(stopEventId)
    stopEventId = null
  }
}

/**
 * Play the given tracks simultaneously on a shared transport timeline.
 *
 * @param {Array<{id:string, notes:object[]}>} tracks
 * @param {number} bpm
 * @param {() => void} onEnd  – called when playback finishes naturally
 */
export async function play(tracks, bpm, onEnd) {
  await Tone.start()
  stop() // reset any prior playback

  Tone.Transport.bpm.value = bpm

  let maxBeats = 0

  tracks.forEach((track) => {
    const { events, totalBeats } = notesToEvents(track.notes)
    maxBeats = Math.max(maxBeats, totalBeats)
    if (events.length === 0) return

    const synth = getSynth(track.id)
    const part = new Tone.Part((time, ev) => {
      synth.triggerAttackRelease(ev.note, `${ev.duration * (60 / bpm)}`, time)
    }, events.map((ev) => [`${ev.time * (60 / bpm)}`, ev]))

    part.start(0)
    parts.push(part)
  })

  if (maxBeats === 0) {
    onEnd?.()
    return
  }

  // Schedule a natural stop just after the last note ends
  const endSeconds = maxBeats * (60 / bpm) + 0.3
  stopEventId = Tone.Transport.scheduleOnce(() => {
    stop()
    onEnd?.()
  }, endSeconds)

  Tone.Transport.start()
}

/** Stop playback and clear scheduled events. */
export function stop() {
  Tone.Transport.stop()
  Tone.Transport.cancel(0)
  Tone.Transport.position = 0
  disposeParts()
}

/**
 * Render the enabled tracks to an audio Blob by tapping the master output with
 * a Tone.Recorder during a real-time playback pass. Returns a WebM blob.
 *
 * @param {Array<{id:string, notes:object[]}>} tracks
 * @param {number} bpm
 * @returns {Promise<Blob>} audio/webm blob
 */
export async function renderMix(tracks, bpm) {
  await Tone.start()
  const recorder = new Tone.Recorder()
  getMaster().connect(recorder)
  recorder.start()

  // Reuse the exact multi-track playback path; resolve on natural end.
  await new Promise((resolve) => play(tracks, bpm, resolve))

  const blob = await recorder.stop()
  getMaster().disconnect(recorder)
  recorder.dispose()
  return blob
}

/**
 * Render the enabled tracks and return a 16-bit PCM WAV Blob. Records via
 * renderMix, then decodes that audio and re-encodes it as WAV.
 */
export async function renderWav(tracks, bpm) {
  const webm = await renderMix(tracks, bpm)
  const arrayBuf = await webm.arrayBuffer()
  const audioBuf = await Tone.getContext().rawContext.decodeAudioData(arrayBuf)
  return audioBufferToWav(audioBuf)
}

/** Encode an AudioBuffer as a 16-bit PCM WAV Blob. */
function audioBufferToWav(buffer) {
  const numCh = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const numFrames = buffer.length
  const blockAlign = numCh * 2
  const dataSize = numFrames * blockAlign
  const view = new DataView(new ArrayBuffer(44 + dataSize))

  let off = 0
  const str = (s) => { for (let i = 0; i < s.length; i++) view.setUint8(off++, s.charCodeAt(i)) }
  const u32 = (v) => { view.setUint32(off, v, true); off += 4 }
  const u16 = (v) => { view.setUint16(off, v, true); off += 2 }

  str('RIFF'); u32(36 + dataSize); str('WAVE')
  str('fmt '); u32(16); u16(1); u16(numCh); u32(sampleRate); u32(sampleRate * blockAlign); u16(blockAlign); u16(16)
  str('data'); u32(dataSize)

  const channels = []
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c))
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]))
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      off += 2
    }
  }
  return new Blob([view], { type: 'audio/wav' })
}
