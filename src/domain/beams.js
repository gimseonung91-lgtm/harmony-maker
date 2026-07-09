import { getDuration } from './durations'

export function isBeamableDuration(duration) {
  const vex = getDuration(duration).vex
  return vex === '8' || vex === '16'
}

function canBeamPair(notes, index) {
  const current = notes[index]
  const next = notes[index + 1]
  if (!current?.beam || !next) return false
  if (current.type === 'rest' || next.type === 'rest') return false
  return isBeamableDuration(current.duration) && isBeamableDuration(next.duration)
}

export function collectBeamNoteGroups(notes, tickables) {
  const groups = []
  let group = null

  for (let i = 0; i < notes.length - 1; i += 1) {
    if (canBeamPair(notes, i) && tickables[i] && tickables[i + 1]) {
      if (!group) group = [tickables[i]]
      group.push(tickables[i + 1])
    } else if (group) {
      if (group.length > 1) groups.push(group)
      group = null
    }
  }

  if (group && group.length > 1) groups.push(group)
  return groups
}
