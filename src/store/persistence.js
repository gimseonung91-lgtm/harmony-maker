// Autosave: persist the project to localStorage (debounced) and restore it
// on load, so a refresh never loses work. Only durable state is saved —
// transient UI/playback state stays out of storage.

export const STORAGE_KEY = 'harmony-maker-project-v1'
const DEBOUNCE_MS = 500

// The persisted projection of the store state.
export function toPersisted(s) {
  return {
    projectInfo: s.projectInfo,
    melody: s.melody,
    derivedLines: s.derivedLines,
    importedLines: s.importedLines,
    enabledTracks: s.enabledTracks,
    bpm: s.bpm,
  }
}

// Read and validate a saved project; null when absent or corrupt.
export function loadSavedProject(storage, defaultProject) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
    if (!saved || typeof saved !== 'object') return null
    return {
      projectInfo: { ...defaultProject, ...saved.projectInfo },
      melody: saved.melody ?? [],
      derivedLines: saved.derivedLines ?? [],
      importedLines: saved.importedLines ?? [],
      enabledTracks: saved.enabledTracks ?? { melody: true },
      bpm: saved.bpm ?? 90,
    }
  } catch {
    return null // corrupted or unavailable storage — start fresh
  }
}

// Hydrate the store from storage, then keep storage in sync (debounced).
export function attachPersistence(store, defaultProject, storage = globalThis.localStorage) {
  const saved = loadSavedProject(storage, defaultProject)
  if (saved) store.setState(saved)

  let saveTimer = null
  store.subscribe((s) => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(toPersisted(s)))
      } catch { /* storage full/blocked — autosave is best-effort */ }
    }, DEBOUNCE_MS)
  })
}
