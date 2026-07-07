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
          '압축된 .mxl 형식은 지원하지 않습니다. 비압축 MusicXML(.musicxml)로 다시 내보내 주세요.'
        )
      }
      const text = await file.text()
      const { lines, meta } = parseMusicXML(text)
      setImportedLines(lines)
      if (meta.keySignature || meta.timeSignature) setProjectInfo(meta)
      const total = lines.reduce((a, l) => a + l.notes.length, 0)
      setStatus('idle')
      setMessage(`✓ “${file.name}”에서 ${lines.length}개 라인(음표 ${total}개)을 가져왔습니다`)
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'MusicXML 파일을 해석할 수 없습니다.')
    } finally {
      e.target.value = ''
    }
  }

  async function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('loading')
    setMessage(
      '⏳ 이미지 분석 중… 보통 2분 이내에 끝납니다. 이 탭을 닫지 말고 기다려 주세요.'
    )
    try {
      const { lines, meta, usedBackend } = await analyzeScoreImage(file)
      setImportedLines(lines)
      if (meta.keySignature || meta.timeSignature) setProjectInfo(meta)
      const total = lines.reduce((a, l) => a + l.notes.length, 0)
      setStatus('idle')
      setMessage(
        usedBackend
          ? `✓ “${file.name}”에서 ${lines.length}개 라인(음표 ${total}개)을 인식했습니다`
          : 'OMR 백엔드가 설정되지 않아 샘플 라인을 불러왔습니다.'
      )
    } catch (err) {
      setStatus('error')
      setMessage(err.message || '이미지를 분석할 수 없습니다.')
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div>
      <SectionLabel>MusicXML 가져오기</SectionLabel>
      <p className="toolbar-hint">
        MuseScore·oemer·music21 등에서 내보낸 <strong>.musicxml</strong> 파일을
        업로드하세요. 시스템(단) 단위로 나뉘어 여러 라인으로 들어오며,
        보컬+피아노 악보에서는 <strong>맨 위 보컬 파트만</strong> 가져옵니다.
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
        {status === 'loading' ? '분석 중…' : '↑  MusicXML 업로드'}
      </button>

      <SectionLabel>악보 이미지 (OMR)</SectionLabel>
      <p className="toolbar-hint">
        <strong>인쇄된</strong> 악보의 <strong>고해상도</strong> 사진/스캔을
        업로드하세요 (300 DPI 스캔 또는 원본 크기 사진 — 웹 미리보기처럼 작은
        이미지는 실패합니다). 보컬+피아노 악보는 <strong>보컬 라인만</strong>{' '}
        추출됩니다. 손글씨 악보는 대부분 실패합니다.
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
        ↑  악보 이미지 업로드
      </button>

      {message && (
        <p className={`toolbar-status toolbar-status--${status === 'idle' ? 'success' : status}`} role="status">
          {message}
        </p>
      )}
    </div>
  )
}
