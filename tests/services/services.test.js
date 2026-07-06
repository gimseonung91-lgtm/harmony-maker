// Lazy service boundaries: cached dynamic-import promise identity.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/utils/audioEngine', () => ({ play: vi.fn(), stop: vi.fn() }))
vi.mock('../../src/utils/pdfExport', () => ({ exportToPDF: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
})

describe('audioService', () => {
  it('returns the same promise for repeated loads (single fetch)', async () => {
    const { loadAudioEngine } = await import('../../src/services/audioService')
    const p1 = loadAudioEngine()
    const p2 = loadAudioEngine()
    expect(p1).toBe(p2)
    expect((await p1).play).toBeTypeOf('function')
  })

  it('stopPlayback is a no-op when the engine was never loaded', async () => {
    const { stopPlayback } = await import('../../src/services/audioService')
    const engine = await import('../../src/utils/audioEngine')
    await stopPlayback()
    expect(engine.stop).not.toHaveBeenCalled()
  })

  it('stopPlayback stops a loaded engine', async () => {
    const { loadAudioEngine, stopPlayback } = await import('../../src/services/audioService')
    const engine = await loadAudioEngine()
    await stopPlayback()
    expect(engine.stop).toHaveBeenCalledTimes(1)
  })
})

describe('exportService', () => {
  it('returns the same promise for repeated loads', async () => {
    const { loadPdfExporter } = await import('../../src/services/exportService')
    const p1 = loadPdfExporter()
    expect(loadPdfExporter()).toBe(p1)
    expect((await p1).exportToPDF).toBeTypeOf('function')
  })
})
