// Bundle budget: the eager (statically imported) chunk closure must not
// contain the heavy audio/PDF stacks, and its raw+gzip totals must stay
// below the pre-refactor baseline. Run after `vite build` (build:budget).
import { readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(ROOT, 'dist')
const manifest = JSON.parse(readFileSync(join(DIST, '.vite', 'manifest.json'), 'utf8'))
const baseline = JSON.parse(readFileSync(join(ROOT, 'scripts', 'bundle-baseline.json'), 'utf8'))

// Chunk keys that must never appear in the eager closure.
const FORBIDDEN_KEYS = /audioEngine|pdfExport|node_modules\/(tone|jspdf|html2canvas)\//
// Library signatures that must not appear inside eager chunk contents.
const FORBIDDEN_MARKERS = ['html2canvas', 'jsPDF']

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry)
if (!entryKey) throw new Error('No entry in manifest')

// Walk static imports only — dynamic imports are the lazy boundary.
const eager = new Set()
const queue = [entryKey]
while (queue.length) {
  const key = queue.shift()
  if (eager.has(key)) continue
  eager.add(key)
  for (const dep of manifest[key].imports ?? []) queue.push(dep)
}

let rawBytes = 0
let gzipBytes = 0
const problems = []

for (const key of eager) {
  if (FORBIDDEN_KEYS.test(key)) problems.push(`eager closure contains forbidden chunk: ${key}`)
  const file = manifest[key].file
  if (!file.endsWith('.js')) continue
  const content = readFileSync(join(DIST, file))
  rawBytes += statSync(join(DIST, file)).size
  gzipBytes += gzipSync(content).length
  for (const marker of FORBIDDEN_MARKERS) {
    if (content.includes(marker)) problems.push(`eager chunk ${file} contains "${marker}"`)
  }
}

const report = {
  eagerChunks: [...eager].map((k) => manifest[k].file),
  totals: { rawBytes, gzipBytes },
  baseline: { rawBytes: baseline.eager.rawBytes, gzipBytes: baseline.eager.gzipBytes },
  deltaRaw: rawBytes - baseline.eager.rawBytes,
  deltaGzip: gzipBytes - baseline.eager.gzipBytes,
  deltaRawPct: `${(((rawBytes - baseline.eager.rawBytes) / baseline.eager.rawBytes) * 100).toFixed(1)}%`,
  deltaGzipPct: `${(((gzipBytes - baseline.eager.gzipBytes) / baseline.eager.gzipBytes) * 100).toFixed(1)}%`,
}
console.log(JSON.stringify(report, null, 2))

if (rawBytes >= baseline.eager.rawBytes) problems.push('eager raw bytes did not improve on baseline')
if (gzipBytes >= baseline.eager.gzipBytes) problems.push('eager gzip bytes did not improve on baseline')

if (problems.length) {
  console.error('\nBUDGET FAIL:\n- ' + problems.join('\n- '))
  process.exit(1)
}
console.log('\nBUDGET OK')
