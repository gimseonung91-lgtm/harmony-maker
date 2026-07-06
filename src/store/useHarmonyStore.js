// The app store: domain slices composed behind one unchanged public hook.
// State keys, action names, ids, undo semantics, and the persisted shape are
// stable contracts — see tests/store/*.test.js.
import { create } from 'zustand'
import { createProjectSlice, defaultProject } from './slices/projectSlice'
import { createEditorSlice } from './slices/editorSlice'
import { createLineSlice } from './slices/lineSlice'
import { createPlaybackUiSlice } from './slices/playbackUiSlice'
import { attachPersistence } from './persistence'

export const useHarmonyStore = create((set, get) => ({
  ...createProjectSlice(set, get),
  ...createEditorSlice(set, get),
  ...createLineSlice(set, get),
  ...createPlaybackUiSlice(set, get),
}))

attachPersistence(useHarmonyStore, defaultProject)

// Dev-only: expose store for debugging in the browser console
if (import.meta.env.DEV) {
  window.__harmonyStore = useHarmonyStore
}
