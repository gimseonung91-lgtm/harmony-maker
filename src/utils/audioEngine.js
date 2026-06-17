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

// One synth per track id, lazily created and reused.
const synths = new Map()
const parts = []
let stopEventId = null

function getSynth(trackId) {
  if (!synths.has(trackId)) {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.6 },
    }).toDestination()
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
