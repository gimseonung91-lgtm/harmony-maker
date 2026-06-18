import { useEffect, useRef } from 'react'
import { pitchToVex } from '../utils/pitchUtils'

/**
 * Renders a single monophonic line (melody or harmony) onto a VexFlow canvas.
 * Supports notes, rests, automatic beaming of eighth/sixteenth notes, and ties.
 *
 * @param {object[]} notes        – array of note objects { type, pitch, duration, tie, lyric }
 * @param {object}   projectInfo  – { clef, keySignature, timeSignature }
 * @param {function} [onLayout]   – called with [{ id, x }] after layout (note X centers)
 * @returns {{ containerRef }}
 */
export function useVexFlow(notes, projectInfo, onLayout) {
  const containerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let cancelled = false
    el.innerHTML = ''

    import('vexflow').then((VF) => {
      if (cancelled) return
      el.innerHTML = ''

      const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Beam, StaveTie, Annotation } = VF

      const renderer = new Renderer(el, Renderer.Backends.SVG)
      const width = el.clientWidth || 900
      renderer.resize(width, 160)

      const ctx = renderer.getContext()
      ctx.setFont('Arial', 10)
      ctx.setFillStyle('#E0E0E0')
      ctx.setStrokeStyle('#E0E0E0')

      const stave = new Stave(10, 24, width - 20)
      stave.addClef(projectInfo.clef ?? 'treble')
      stave.addKeySignature(projectInfo.keySignature ?? 'C')
      stave.addTimeSignature(projectInfo.timeSignature ?? '4/4')
      stave.setContext(ctx).draw()

      if (notes.length === 0) return

      // ── Build VexFlow tickables ───────────────────────────────────
      const vexNotes = notes.map((n) => {
        if (n.type === 'rest') {
          // Rest: position on the middle line, duration suffixed with 'r'
          return new StaveNote({
            keys: ['b/4'],
            duration: `${n.duration ?? 'q'}r`,
            clef: projectInfo.clef ?? 'treble',
          })
        }

        const key = pitchToVex(n.pitch)
        const sn = new StaveNote({
          keys: [key],
          duration: n.duration ?? 'q',
          clef: projectInfo.clef ?? 'treble',
        })
        if (key.includes('#')) sn.addModifier(new Accidental('#'), 0)
        if (key.includes('b') && !key.startsWith('b')) sn.addModifier(new Accidental('b'), 0)

        // Lyric rendered beneath the note
        if (n.lyric) {
          const annotation = new Annotation(n.lyric)
            .setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
            .setFont('Arial', 11)
          sn.addModifier(annotation, 0)
        }
        return sn
      })

      const voice = new Voice({ num_beats: 4, beat_value: 4 }).setMode(2) // SOFT
      voice.addTickables(vexNotes)

      // Auto-beam consecutive eighth/sixteenth notes (skips rests automatically)
      const beams = Beam.generateBeams(vexNotes)

      // Build ties: a note with tie=true connects to the next sounding note
      const ties = []
      notes.forEach((n, i) => {
        const next = notes[i + 1]
        if (n.tie && next && n.type !== 'rest' && next.type !== 'rest') {
          ties.push(
            new StaveTie({
              first_note: vexNotes[i],
              last_note: vexNotes[i + 1],
              first_indices: [0],
              last_indices: [0],
            })
          )
        }
      })

      new Formatter().joinVoices([voice]).format([voice], width - 80)
      voice.draw(ctx, stave)
      beams.forEach((b) => b.setContext(ctx).draw())
      ties.forEach((t) => t.setContext(ctx).draw())

      // Report note X centers (canvas-relative) for drag-reordering & lyrics UI
      if (onLayout) {
        const positions = vexNotes.map((vn, i) => ({
          id: notes[i].id,
          x: vn.getAbsoluteX(),
        }))
        onLayout(positions)
      }
    }).catch(() => {
      el.innerHTML = '<p style="color:#606060;padding:16px;font-size:12px;">VexFlow loading…</p>'
    })

    return () => { cancelled = true }
  }, [notes, projectInfo])

  return { containerRef }
}
