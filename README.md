# Harmony Maker

음악 지식이 부족해도 직관적으로 **보컬 화음 악보**를 만들 수 있는 웹 애플리케이션입니다.

**▶ 라이브 데모:** https://gimseonung91-lgtm.github.io/harmony-maker/

## 주요 기능

- 🎼 **멜로디 입력** — 오선지 클릭 또는 툴바 드래그앤드롭으로 음표 배치, 드래그로 순서·높낮이 재배치
- 🎶 **화음 자동 생성** — 버튼 한 번으로 3도/5도 다이아토닉 화성을 독립된 오선지 줄로 생성
- 📄 **MusicXML 임포트** — MuseScore·oemer 등에서 내보낸 악보를 시스템(단) 단위로 분리해 불러오기
- 📷 **악보 이미지 인식(OMR)** — 사진/스캔 이미지를 oemer 백엔드로 분석해 음표 추출
- 🔊 **재생 & 음원 다운로드** — Tone.js 다중 트랙 재생, 트랙별 음소거, WAV/WebM 내보내기
- 🖨️ **PDF 내보내기** — 작성한 모든 줄을 A4 PDF로 저장
- ✏️ 가사 입력, 쉼표, 이음줄(tie), 자동 빔(beam), 숫자키(1~5) 음길이 전환

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React 18 + Vite 6, Zustand, VexFlow(악보 렌더), Tone.js(오디오), @dnd-kit(드래그앤드롭), jsPDF |
| 백엔드 (OMR) | Python 3.11, FastAPI, oemer, OpenCV — Hugging Face Spaces(Docker) 배포 |
| 배포 | GitHub Pages (GitHub Actions 자동 배포) |

## 로컬 실행

```bash
# 프론트엔드
npm install
npm run dev
# → http://localhost:5173/harmony-maker/  (끝의 /harmony-maker/ 경로 필수)

# (선택) 이미지 OMR 백엔드
cd backend
pip install -r requirements.txt
python -m uvicorn app:app --port 7860
```

이미지 OMR을 로컬 백엔드로 쓰려면 루트에 `.env.local`을 만들고 다음을 설정합니다:

```
VITE_OMR_BACKEND_URL=http://localhost:7860
```

> **참고:** OMR(oemer)은 CPU에서 한 페이지에 수 분이 걸립니다. 빠른 경로는 MusicXML 임포트입니다 — 악보를 MuseScore 등에서 `.musicxml`로 내보내 업로드하세요.

## 프로젝트 구조

```
src/
├─ App.jsx                  # 레이아웃, 헤더 컨트롤, DnD, 재생/다운로드
├─ store/useHarmonyStore.js # Zustand 전역 상태 (멜로디/화성/임포트 라인)
├─ hooks/useVexFlow.js      # VexFlow 오선지 렌더 훅
├─ components/              # 캔버스, 툴바, 라인 카드 UI
└─ utils/                   # 화성 계산, MusicXML 파서, OMR, 오디오, PDF
backend/                    # FastAPI + oemer OMR 서버 (HF Spaces용)
```

자세한 기술 명세와 진행 상황은 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)를 참고하세요.
