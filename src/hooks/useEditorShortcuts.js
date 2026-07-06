// Global keyboard shortcuts for the melody editor:
// number keys set note length (selected note, else next-draw duration);
// Ctrl/Cmd+Z undoes the last melody edit. Ignored while typing in fields.
import { useEffect } from 'react'
import { useHarmonyStore } from '../store/useHarmonyStore'
import { SHORTCUT_TO_DURATION } from '../domain/durations'

export function useEditorShortcuts() {
  const setNoteDuration = useHarmonyStore((s) => s.setNoteDuration)
  const setSelectedDuration = useHarmonyStore((s) => s.setSelectedDuration)
  const undo = useHarmonyStore((s) => s.undo)

  useEffect(() => {
    function onKeyDown(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
        return
      }
      const dur = SHORTCUT_TO_DURATION[e.key]
      if (!dur) return
      const id = useHarmonyStore.getState().selectedNoteId
      if (id) setNoteDuration(id, dur)
      else setSelectedDuration(dur)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setNoteDuration, setSelectedDuration, undo])
}
