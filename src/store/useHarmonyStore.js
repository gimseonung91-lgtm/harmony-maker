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

export const useHarmonyStore = create((set) => ({
  // ── Project metadata ──────────────────────────────────────────────
  projectInfo: { ...defaultProject },

  // ── Main melody being edited (drag & drop target) ─────────────────
  // Each element: { id, type: 'note'|'rest', pitch, duration, tie }
  melody: [],

  // ── Independent harmony staves generated from the melody ──────────
  // Each line: { id, type: '3rd_harmony'|'5th_harmony', notes: [...] }
  derivedLines: [],

  // ── UI state ──────────────────────────────────────────────────────
  toolbarOpen: true,
  activeCategory: 'notes',
  // Duration used when adding a note by clicking on the staff
  selectedDuration: 'q',

  // ── Project actions ───────────────────────────────────────────────
  setProjectInfo: (patch) =>
    set((s) => ({ projectInfo: { ...s.projectInfo, ...patch } })),

  toggleToolbar: () => set((s) => ({ toolbarOpen: !s.toolbarOpen })),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setSelectedDuration: (duration) => set({ selectedDuration: duration }),

  // ── Melody editing ────────────────────────────────────────────────
  addNote: (noteData) =>
    set((s) => ({
      melody: [
        ...s.melody,
        {
          id: newId('note'),
          type: noteData.type ?? 'note',
          pitch: noteData.pitch ?? null,
          duration: noteData.duration ?? 'q',
          tie: false,
        },
      ],
    })),

  removeNote: (id) =>
    set((s) => ({ melody: s.melody.filter((n) => n.id !== id) })),

  toggleTie: (id) =>
    set((s) => ({
      melody: s.melody.map((n) => (n.id === id ? { ...n, tie: !n.tie } : n)),
    })),

  clearMelody: () => set({ melody: [] }),

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

      const others = s.derivedLines.filter((l) => l.type !== type)
      const next = [...others, { id: newId('line'), type, notes }]
      next.sort((a, b) => HARMONY_ORDER[a.type] - HARMONY_ORDER[b.type])
      return { derivedLines: next }
    }),

  removeDerivedLine: (id) =>
    set((s) => ({ derivedLines: s.derivedLines.filter((l) => l.id !== id) })),

  clearAll: () => set({ melody: [], derivedLines: [] }),
}))

// Dev-only: expose store for debugging in the browser console
if (import.meta.env.DEV) {
  window.__harmonyStore = useHarmonyStore
}
