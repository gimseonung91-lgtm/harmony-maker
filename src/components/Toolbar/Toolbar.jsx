// Tool surface: tab strip + the active panel. Panels own their content;
// this file is composition only.
import { useHarmonyStore } from '../../store/useHarmonyStore'
import { NotesPanel } from './NotesPanel'
import { ImportPanel } from './ImportPanel'
import { SettingsPanel } from './SettingsPanel'
import './toolbar.css'

const CATEGORIES = [
  { id: 'notes', label: '음표' },
  { id: 'import', label: '가져오기' },
  { id: 'settings', label: '설정' },
]

export function Toolbar() {
  const toolbarOpen = useHarmonyStore((s) => s.toolbarOpen)
  const activeCategory = useHarmonyStore((s) => s.activeCategory)
  const setActiveCategory = useHarmonyStore((s) => s.setActiveCategory)
  const toggleToolbar = useHarmonyStore((s) => s.toggleToolbar)

  if (!toolbarOpen) return null

  // Close from the overlay (tablet/mobile) and hand focus back to the
  // header toggle so keyboard users are not stranded.
  function closeAndRestoreFocus() {
    toggleToolbar()
    requestAnimationFrame(() => document.getElementById('toolbar-toggle')?.focus())
  }

  return (
    <aside id="tool-surface" className="toolbar-aside" aria-label="도구함">
      <button className="toolbar-close" onClick={closeAndRestoreFocus} aria-label="도구함 닫기">
        ✕ 도구함 닫기
      </button>
      <div className="toolbar-tabs" role="tablist">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`toolbar-tab${activeCategory === cat.id ? ' toolbar-tab--active' : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="toolbar-body">
        {activeCategory === 'notes' && <NotesPanel />}
        {activeCategory === 'import' && <ImportPanel />}
        {activeCategory === 'settings' && <SettingsPanel />}
      </div>
    </aside>
  )
}
