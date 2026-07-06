// Characterization: Toolbar tabs, duration palette, rests, settings, .mxl rejection.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndContext } from '@dnd-kit/core'
import { Toolbar } from '../../src/components/Toolbar/Toolbar'
import { useHarmonyStore } from '../../src/store/useHarmonyStore'

const g = () => useHarmonyStore.getState()

function renderToolbar() {
  return render(<DndContext><Toolbar /></DndContext>)
}

beforeEach(() => {
  useHarmonyStore.setState({
    toolbarOpen: true,
    activeCategory: 'notes',
    selectedDuration: 'q',
    importedLines: [],
    projectInfo: { title: 'Untitled', keySignature: 'C', clef: 'treble', timeSignature: '4/4' },
  })
})

describe('Toolbar', () => {
  it('renders nothing when closed', () => {
    useHarmonyStore.setState({ toolbarOpen: false })
    const { container } = renderToolbar()
    expect(container.querySelector('aside')).toBeNull()
  })

  it('switches between Notes / Import / Settings tabs', async () => {
    const user = userEvent.setup()
    renderToolbar()
    expect(screen.getByText('Duration')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Import' }))
    expect(screen.getByText(/Upload MusicXML/)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    expect(screen.getByText('Key Signature')).toBeInTheDocument()
  })

  it('selects a duration for click-to-add', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByTitle('Half'))
    expect(g().selectedDuration).toBe('h')
  })

  it('shows the five-entry rest palette (w, h, q, 8, 16)', () => {
    renderToolbar()
    const rests = screen.getAllByText('rest')
    expect(rests).toHaveLength(5)
  })

  it('updates project settings', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    await user.selectOptions(screen.getByDisplayValue('C'), 'F')
    expect(g().projectInfo.keySignature).toBe('F')
    await user.selectOptions(screen.getByDisplayValue('4/4'), '6/8')
    expect(g().projectInfo.timeSignature).toBe('6/8')
  })

  it('rejects compressed .mxl uploads with the existing message', async () => {
    const user = userEvent.setup()
    const { container } = renderToolbar()
    await user.click(screen.getByRole('tab', { name: 'Import' }))
    const input = container.querySelector('input[accept*="musicxml"]')
    const file = new File(['PK-zip-bytes'], 'score.mxl', { type: 'application/octet-stream' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(await screen.findByText(/Compressed \.mxl is not supported/)).toBeInTheDocument()
    expect(g().importedLines).toEqual([])
  })
})
