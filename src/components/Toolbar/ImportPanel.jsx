import { useRef, useState } from 'react'
import { useHarmonyStore } from '../../store/useHarmonyStore'
import { SectionLabel } from './SectionLabel'
import { analyzeScoreImage } from '../../utils/omr'
import { parseMusicXML } from '../../utils/musicxml'

export function ImportPanel() {
  const setImportedLines = useHarmonyStore((s) => s.setImportedLines)
  const setProjectInfo = useHarmonyStore((s) => s.setProjectInfo)
  const xmlInputRef = useRef(null)
  const imgInputRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [message, setMessage] = useState('')

  async function handleMusicXML(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('loading')
    try {
      if (/\.mxl$/i.test(file.name)) {
        throw new Error(
          'Compressed .mxl is not supported. Re-export as uncompressed MusicXML (.musicxml).'
        )
      }
      const text = await file.text()
      const { lines, meta } = parseMusicXML(text)
      setImportedLines(lines)
      if (meta.keySignature || meta.timeSignature) setProjectInfo(meta)
      const total = lines.reduce((a, l) => a + l.notes.length, 0)
      setStatus('idle')
      setMessage(`✓ Imported ${lines.length} lines (${total} notes) from “${file.name}”`)
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Could not parse the MusicXML file.')
    } finally {
      e.target.value = ''
    }
  }

  async function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('loading')
    setMessage(
      '⏳ Analyzing image… this usually takes under 2 minutes. ' +
      'Please keep this tab open.'
    )
    try {
      const { lines, meta, usedBackend } = await analyzeScoreImage(file)
      setImportedLines(lines)
      if (meta.keySignature || meta.timeSignature) setProjectInfo(meta)
      const total = lines.reduce((a, l) => a + l.notes.length, 0)
      setStatus('idle')
      setMessage(
        usedBackend
          ? `✓ Recognized ${lines.length} lines (${total} notes) from “${file.name}”`
          : `Loaded a sample line (image OMR backend not configured).`
      )
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Could not analyze the image.')
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div>
      <SectionLabel>Import MusicXML</SectionLabel>
      <p className="toolbar-hint">
        Upload a <strong>.musicxml</strong> file from oemer, MuseScore, music21 or
        any notation tool. It is split into separate lines (one per system).
      </p>

      <input
        ref={xmlInputRef}
        type="file"
        accept=".musicxml,.xml,application/vnd.recordare.musicxml+xml,text/xml"
        onChange={handleMusicXML}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => xmlInputRef.current?.click()}
        disabled={status === 'loading'}
        className="toolbar-upload-btn"
      >
        {status === 'loading' ? 'Parsing…' : '↑  Upload MusicXML'}
      </button>

      <SectionLabel>Sheet-music image (OMR)</SectionLabel>
      <p className="toolbar-hint">
        Upload a photo or scan of a <strong>printed</strong> score at{' '}
        <strong>high resolution</strong> (a 300 DPI scan or full-size camera
        photo — small web previews fail). Clear, flat, straight-on full pages
        work best; handwritten scores usually fail.
      </p>
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        onChange={handleImage}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => imgInputRef.current?.click()}
        disabled={status === 'loading'}
        className="toolbar-upload-btn toolbar-upload-btn--image"
      >
        ↑  Upload score image
      </button>

      {message && (
        <p className={`toolbar-status toolbar-status--${status === 'idle' ? 'success' : status}`} role="status">
          {message}
        </p>
      )}
    </div>
  )
}
