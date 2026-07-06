// Enforce module-size limits on production sources.
// Logical lines = nonblank lines excluding comment-only lines.
// Limits: App.jsx <= 180, Toolbar.jsx <= 120, every other src JS/JSX <= 250.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../src', import.meta.url))
const LIMITS = [
  { match: /(^|[\\/])App\.jsx$/, limit: 180 },
  { match: /(^|[\\/])Toolbar\.jsx$/, limit: 120 },
  { match: /\.(js|jsx)$/, limit: 250 },
]

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.(js|jsx)$/.test(name)) yield p
  }
}

function logicalLines(text) {
  let inBlock = false
  let count = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (inBlock) {
      if (line.includes('*/')) inBlock = false
      continue
    }
    if (line.startsWith('//')) continue
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlock = true
      continue
    }
    count++
  }
  return count
}

let failed = false
for (const file of walk(SRC)) {
  const rel = relative(join(SRC, '..'), file).split(sep).join('/')
  const lines = logicalLines(readFileSync(file, 'utf8'))
  const { limit } = LIMITS.find((r) => r.match.test(file))
  const ok = lines <= limit
  if (!ok) failed = true
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${String(lines).padStart(4)} / ${String(limit).padEnd(4)} ${rel}`)
}

process.exit(failed ? 1 : 0)
