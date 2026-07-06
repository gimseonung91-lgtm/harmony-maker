// Derived harmony lines and imported (OMR / MusicXML) lines.
import { harmonize } from '../../utils/harmonyLogic'
import { newId } from '../helpers'

const HARMONY_ORDER = { '3rd_harmony': 0, '5th_harmony': 1 }

export const createLineSlice = (set) => ({
  // Independent harmony staves generated from the melody.
  // Each line: { id, type: '3rd_harmony'|'5th_harmony', notes: [...] }
  derivedLines: [],

  // Lines imported from a score image / MusicXML (one per system).
  // Each line: { id, notes: [...] } where notes carry a `measure` index.
  importedLines: [],

  // ── Harmony generation (independent lines) ────────────────────────
  generateHarmony: (interval) =>
    set((s) => {
      if (s.melody.length === 0) return {}
      const { keySignature } = s.projectInfo
      const type = interval === '3rd' ? '3rd_harmony' : '5th_harmony'

      const notes = s.melody.map((n) => {
        if (n.type === 'rest') {
          return { id: newId('h'), type: 'rest', pitch: null, duration: n.duration, tie: n.tie }
        }
        const harmonized = harmonize(n.pitch, keySignature, interval)
        return {
          id: newId('h'),
          type: 'note',
          pitch: harmonized ?? n.pitch, // fall back to melody pitch if non-diatonic
          duration: n.duration,
          tie: n.tie,
        }
      })

      // Replace any existing line of this type, reusing its id (and toggle state)
      const existing = s.derivedLines.find((l) => l.type === type)
      const id = existing?.id ?? newId('line')
      const others = s.derivedLines.filter((l) => l.type !== type)
      const next = [...others, { id, type, notes }]
      next.sort((a, b) => HARMONY_ORDER[a.type] - HARMONY_ORDER[b.type])

      return {
        derivedLines: next,
        enabledTracks: { ...s.enabledTracks, [id]: s.enabledTracks[id] ?? true },
      }
    }),

  removeDerivedLine: (id) =>
    set((s) => {
      const { [id]: _removed, ...enabledTracks } = s.enabledTracks
      return { derivedLines: s.derivedLines.filter((l) => l.id !== id), enabledTracks }
    }),

  // ── Imported lines (multi-system OMR / MusicXML) ──────────────────
  setImportedLines: (lines) =>
    set((s) => {
      const mapped = lines.map((l) => ({ id: newId('imp'), notes: l.notes }))
      const enabledTracks = { ...s.enabledTracks }
      mapped.forEach((l) => { enabledTracks[l.id] = true })
      return { importedLines: mapped, enabledTracks }
    }),

  removeLine: (id) =>
    set((s) => {
      const { [id]: _removed, ...enabledTracks } = s.enabledTracks
      return { importedLines: s.importedLines.filter((l) => l.id !== id), enabledTracks }
    }),

  moveLine: (id, dir) =>
    set((s) => {
      const arr = [...s.importedLines]
      const i = arr.findIndex((l) => l.id === id)
      const j = dir === 'up' ? i - 1 : i + 1
      if (i < 0 || j < 0 || j >= arr.length) return {}
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { importedLines: arr }
    }),

  // Split one line into separate lines, one per measure.
  splitLine: (id) =>
    set((s) => {
      const idx = s.importedLines.findIndex((l) => l.id === id)
      if (idx < 0) return {}

      const groups = new Map()
      s.importedLines[idx].notes.forEach((n) => {
        const key = n.measure ?? 0
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(n)
      })
      if (groups.size <= 1) return {} // nothing to split

      const newLines = [...groups.values()].map((notes) => ({ id: newId('imp'), notes }))
      const arr = [...s.importedLines]
      arr.splice(idx, 1, ...newLines)

      const { [id]: _removed, ...enabledTracks } = s.enabledTracks
      newLines.forEach((l) => { enabledTracks[l.id] = true })
      return { importedLines: arr, enabledTracks }
    }),
})
