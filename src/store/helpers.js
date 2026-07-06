// Shared helpers for store slices.

export function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// Snapshot the melody for undo (Ctrl+Z), capped at 50 steps.
export function pushUndo(s) {
  return [...s._undo.slice(-49), s.melody]
}
