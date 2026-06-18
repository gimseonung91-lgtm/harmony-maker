import { create } from 'zustand'
import { harmonize } from '../utils/harmonyLogic'

const defaultProject = {
  title: 'Untitled',
  keySignature: 'C',
  clef: 'treble',
  timeSignature: '4/4',
}

const HARMONY_ORDER = { '3rd_harmony': 0, '5th_harmony': 1 }

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export const useHarmonyStore = create((set, get) => ({
  // ── Project metadata ──────────────────────────────────────────────
  projectInfo: { ...defaultProject },

  // ── Main melody being edited (drag & drop target) ─────────────────
  // Each element: { id, type: 'note'|'rest', pitch, duration, tie }
  melody: [],

  // ── Independent harmony staves generated from the melody ──────────
  // Each line: { id, type: '3rd_harmony'|'5th_harmony', notes: [...] }
  derivedLines: [],

  // ── Lines imported from a score image / MusicXML (one per system) ─
  // Each line: { id, notes: [...] } where notes carry a `measure` index.
  importedLines: [],

  // ── UI state ──────────────────────────────────────────────────────
  toolbarOpen: true,
  activeCategory: 'notes',
  // Duration used when adding a note by clicking on the staff
  selectedDuration: 'q',

  // ── Audio / playback state ────────────────────────────────────────
  // Which tracks are unmuted for playback. 'melody' + each derived line id.
  enabledTracks: { melody: true },
  isPlaying: false,
  bpm: 90,

  // Note X centers reported by VexFlow layout (for drag-reordering & lyrics)
  notePositions: [],
  // Currently selected melody note (number keys change its duration)
  selectedNoteId: null,

  // ── Project actions ───────────────────────────────────────────────
  setProjectInfo: (patch) =>
    set((s) => ({ projectInfo: { ...s.projectInfo, ...patch } })),

  toggleToolbar: () => set((s) => ({ toolbarOpen: !s.toolbarOpen })),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setSelectedDuration: (duration) => set({ selectedDuration: duration }),

  // ── Audio actions ─────────────────────────────────────────────────
  toggleTrack: (id) =>
    set((s) => ({
      enabledTracks: { ...s.enabledTracks, [id]: !(s.enabledTracks[id] ?? true) },
    })),
  setBpm: (bpm) => set({ bpm }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  // ── Melody editing ────────────────────────────────────────────────
  setNotePositions: (positions) => set({ notePositions: positions }),
  selectNote: (id) => set((s) => ({ selectedNoteId: s.selectedNoteId === id ? null : id })),

  // Insert a note at a specific index (append when index is omitted)
  addNoteAt: (noteData, index) =>
    set((s) => {
      const note = {
        id: newId('note'),
        type: noteData.type ?? 'note',
        pitch: noteData.pitch ?? null,
        duration: noteData.duration ?? 'q',
        tie: false,
        lyric: '',
      }
      const at = index == null ? s.melody.length : Math.max(0, Math.min(index, s.melody.length))
      const melody = [...s.melody]
      melody.splice(at, 0, note)
      return { melody }
    }),

  addNote: (noteData) => get().addNoteAt(noteData),

  // Move an existing note to a new index and (optionally) a new pitch
  moveNote: (id, index, pitch) =>
    set((s) => {
      const from = s.melody.findIndex((n) => n.id === id)
      if (from < 0) return {}
      const melody = [...s.melody]
      const [note] = melody.splice(from, 1)
      const updated = pitch && note.type !== 'rest' ? { ...note, pitch } : note
      const at = Math.max(0, Math.min(index, melody.length))
      melody.splice(at, 0, updated)
      return { melody }
    }),

  setNoteDuration: (id, duration) =>
    set((s) => ({
      melody: s.melody.map((n) => (n.id === id ? { ...n, duration } : n)),
    })),

  setLyric: (id, lyric) =>
    set((s) => ({
      melody: s.melody.map((n) => (n.id === id ? { ...n, lyric } : n)),
    })),

  removeNote: (id) =>
    set((s) => ({
      melody: s.melody.filter((n) => n.id !== id),
      selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
    })),

  toggleTie: (id) =>
    set((s) => ({
      melody: s.melody.map((n) => (n.id === id ? { ...n, tie: !n.tie } : n)),
    })),

  clearMelody: () => set({ melody: [], selectedNoteId: null }),

  // Replace the whole melody at once (used by the image-import / OMR flow)
  setMelody: (notes) =>
    set(() => ({
      melody: notes.map((n) => ({
        id: newId('note'),
        type: n.type ?? 'note',
        pitch: n.pitch ?? null,
        duration: n.duration ?? 'q',
        tie: n.tie ?? false,
      })),
    })),

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

  clearAll: () =>
    set({ melody: [], derivedLines: [], importedLines: [], enabledTracks: { melody: true } }),
}))

// Dev-only: expose store for debugging in the browser console
if (import.meta.env.DEV) {
  window.__harmonyStore = useHarmonyStore
}
