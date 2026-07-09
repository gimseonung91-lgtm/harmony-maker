// The editable melody line: notes, selection, layout positions, and undo.
import { newId, pushUndo } from '../helpers'
import { isBeamableDuration } from '../../domain/beams'

export const createEditorSlice = (set) => ({
  // Each element: { id, type: 'note'|'rest', pitch, duration, tie, beam, lyric }
  melody: [],
  // Note X centers reported by VexFlow layout (for drag-reordering & lyrics)
  notePositions: [],
  // Currently selected melody note (number keys change its duration)
  selectedNoteId: null,
  // Undo history: past melody snapshots (Ctrl+Z)
  _undo: [],

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
        beam: false,
        lyric: '',
      }
      const at = index == null ? s.melody.length : Math.max(0, Math.min(index, s.melody.length))
      const melody = [...s.melody]
      melody.splice(at, 0, note)
      return { melody, _undo: pushUndo(s) }
    }),

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
      return { melody, _undo: pushUndo(s) }
    }),

  // Overwrite an existing note in place (drop a toolbar tile onto it).
  // Keeps the lyric; a rest tile turns the note into a rest and vice versa.
  replaceNote: (id, data) =>
    set((s) => {
      const i = s.melody.findIndex((n) => n.id === id)
      if (i < 0) return {}
      const prev = s.melody[i]
      const next = {
        ...prev,
        type: data.type ?? prev.type,
        pitch: (data.type ?? prev.type) === 'rest' ? null : (data.pitch ?? prev.pitch),
        duration: data.duration ?? prev.duration,
      }
      const melody = [...s.melody]
      melody[i] = next
      return { melody, _undo: pushUndo(s) }
    }),

  setNoteDuration: (id, duration) =>
    set((s) => ({
      melody: s.melody.map((n) => (
        n.id === id ? { ...n, duration, beam: isBeamableDuration(duration) ? n.beam : false } : n
      )),
      _undo: pushUndo(s),
    })),

  setLyric: (id, lyric) =>
    set((s) => ({
      melody: s.melody.map((n) => (n.id === id ? { ...n, lyric } : n)),
    })),

  removeNote: (id) =>
    set((s) => ({
      melody: s.melody.filter((n) => n.id !== id),
      selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
      _undo: pushUndo(s),
    })),

  toggleTie: (id) =>
    set((s) => ({
      melody: s.melody.map((n) => (n.id === id ? { ...n, tie: !n.tie } : n)),
      _undo: pushUndo(s),
    })),

  toggleBeam: (id) =>
    set((s) => ({
      melody: s.melody.map((n) => (
        n.id === id && n.type !== 'rest' && isBeamableDuration(n.duration)
          ? { ...n, beam: !n.beam }
          : n
      )),
      _undo: pushUndo(s),
    })),

  clearMelody: () => set((s) => ({ melody: [], selectedNoteId: null, _undo: pushUndo(s) })),

  // Replace the whole melody at once (used by the image-import / OMR flow)
  setMelody: (notes) =>
    set((s) => ({
      melody: notes.map((n) => ({
        id: newId('note'),
        type: n.type ?? 'note',
        pitch: n.pitch ?? null,
        duration: n.duration ?? 'q',
        tie: n.tie ?? false,
        beam: n.beam ?? false,
        lyric: n.lyric ?? '',
      })),
      _undo: pushUndo(s),
    })),

  // Undo the last melody edit (Ctrl+Z)
  undo: () =>
    set((s) => {
      if (s._undo.length === 0) return {}
      return {
        melody: s._undo[s._undo.length - 1],
        _undo: s._undo.slice(0, -1),
        selectedNoteId: null,
      }
    }),

  // Load an imported line into the melody editor so it can be edited with
  // the full toolset (drag, replace, lyrics, harmony…).
  editImportedLine: (id) =>
    set((s) => {
      const line = s.importedLines.find((l) => l.id === id)
      if (!line) return {}
      return {
        melody: line.notes.map((n) => ({
          id: newId('note'),
          type: n.type ?? 'note',
          pitch: n.pitch ?? null,
          duration: n.duration ?? 'q',
          tie: n.tie ?? false,
          beam: n.beam ?? false,
          lyric: n.lyric ?? '',
        })),
        selectedNoteId: null,
        _undo: pushUndo(s),
      }
    }),

  clearAll: () =>
    set((s) => ({
      melody: [],
      derivedLines: [],
      importedLines: [],
      enabledTracks: { melody: true },
      _undo: pushUndo(s),
    })),
})
