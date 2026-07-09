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

  it('switches between the 음표 / 가져오기 / 설정 tabs', async () => {
    const user = userEvent.setup()
    renderToolbar()
    expect(screen.getByText('음길이')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '가져오기' }))
    expect(screen.getByText(/MusicXML 업로드/)).toBeInTheDocument()
    expect(screen.queryByText(/악보 이미지 업로드/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '설정' }))
    expect(screen.getByText('조성')).toBeInTheDocument()
  })

  it('selects a duration for click-to-add', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByTitle('2분음표'))
    expect(g().selectedDuration).toBe('h')
  })

  it('shows the five-entry rest palette (w, h, q, 8, 16)', () => {
    renderToolbar()
    for (const title of ['온쉼표', '2분쉼표', '4분쉼표', '8분쉼표', '16분쉼표']) {
      expect(screen.getByTitle(title)).toBeInTheDocument()
    }
    expect(screen.getAllByTitle(/쉼표$/)).toHaveLength(5)
  })

  it('updates project settings', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('tab', { name: '설정' }))
    await user.selectOptions(screen.getByDisplayValue('C'), 'F')
    expect(g().projectInfo.keySignature).toBe('F')
    await user.selectOptions(screen.getByDisplayValue('4/4'), '6/8')
    expect(g().projectInfo.timeSignature).toBe('6/8')
  })

  it('rejects compressed .mxl uploads with the existing message', async () => {
    const user = userEvent.setup()
    const { container } = renderToolbar()
    await user.click(screen.getByRole('tab', { name: '가져오기' }))
    const input = container.querySelector('input[accept*="musicxml"]')
    const file = new File(['PK-zip-bytes'], 'score.mxl', { type: 'application/octet-stream' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(await screen.findByText(/압축된 \.mxl 형식은 지원하지 않습니다/)).toBeInTheDocument()
    expect(g().importedLines).toEqual([])
  })
})
