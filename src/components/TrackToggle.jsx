/**
 * Speaker-style checkbox to mute/unmute a track for playback.
 */
export function TrackToggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={enabled ? 'Mute this track' : 'Unmute this track'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        borderRadius: 'var(--radius-sm)',
        background: enabled ? 'var(--accent-dim)' : 'var(--bg-surface)',
        border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
        color: enabled ? 'var(--accent)' : 'var(--text-muted)',
        fontSize: 12,
        lineHeight: 1,
        cursor: 'pointer',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  )
}
