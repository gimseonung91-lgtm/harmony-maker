// Playback, audio download, and PDF export lifecycle. The heavy audio/PDF
// stacks load lazily through the services. Every async action resolves to
// { ok: true } | { ok: false, error } and never leaks an unhandled rejection.
//
// Callbacks read the store at call time (getState) so their identities are
// stable — memoized consumers (AppHeader) never re-render because of them.
import { useCallback, useState } from 'react'
import { useHarmonyStore } from '../store/useHarmonyStore'
import { loadAudioEngine, stopPlayback } from '../services/audioService'
import { loadPdfExporter } from '../services/exportService'

// Build the enabled-tracks list shared by playback and audio export.
export function buildEnabledTracks({ melody, importedLines, derivedLines, enabledTracks }) {
  const tracks = []
  if (enabledTracks.melody !== false && melody.length > 0) {
    tracks.push({ id: 'melody', notes: melody })
  }
  importedLines.forEach((l) => {
    if (enabledTracks[l.id] !== false) tracks.push({ id: l.id, notes: l.notes })
  })
  derivedLines.forEach((l) => {
    if (enabledTracks[l.id] !== false) tracks.push({ id: l.id, notes: l.notes })
  })
  return tracks
}

// Ordered DOM ids of every rendered staff (for PDF capture).
export function buildExportIds({ importedLines, derivedLines }) {
  return [
    'melody_line',
    ...importedLines.map((l) => `imported_line_${l.id}`),
    ...derivedLines.map((l) => `derived_line_${l.id}`),
  ]
}

export function usePlaybackController() {
  const isPlaying = useHarmonyStore((s) => s.isPlaying)
  const hasContent = useHarmonyStore(
    (s) => s.melody.length > 0 || s.derivedLines.length > 0 || s.importedLines.length > 0
  )
  const [isRendering, setIsRendering] = useState(false)

  const play = useCallback(async () => {
    const s = useHarmonyStore.getState()
    const tracks = buildEnabledTracks(s)
    if (tracks.length === 0) return { ok: false, error: new Error('No tracks to play') }
    try {
      s.setIsPlaying(true)
      const engine = await loadAudioEngine()
      await engine.play(tracks, s.bpm, () => useHarmonyStore.getState().setIsPlaying(false))
      return { ok: true }
    } catch (error) {
      useHarmonyStore.getState().setIsPlaying(false)
      return { ok: false, error }
    }
  }, [])

  const stop = useCallback(async () => {
    try {
      await stopPlayback()
      return { ok: true }
    } catch (error) {
      return { ok: false, error }
    } finally {
      useHarmonyStore.getState().setIsPlaying(false)
    }
  }, [])

  const download = useCallback(async (format) => {
    const s = useHarmonyStore.getState()
    const tracks = buildEnabledTracks(s)
    if (tracks.length === 0) return { ok: false, error: new Error('Nothing to render') }
    setIsRendering(true)
    try {
      const engine = await loadAudioEngine()
      const blob = format === 'wav'
        ? await engine.renderWav(tracks, s.bpm)
        : await engine.renderMix(tracks, s.bpm)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${s.projectInfo.title || 'harmony-maker'}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      return { ok: true }
    } catch (error) {
      return { ok: false, error }
    } finally {
      setIsRendering(false)
    }
  }, [])

  const exportPdf = useCallback(async () => {
    const s = useHarmonyStore.getState()
    try {
      const exporter = await loadPdfExporter()
      await exporter.exportToPDF(buildExportIds(s), s.projectInfo.title)
      return { ok: true }
    } catch (error) {
      return { ok: false, error }
    }
  }, [])

  return { isPlaying, isRendering, hasContent, play, stop, download, exportPdf }
}
