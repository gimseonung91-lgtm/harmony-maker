# Harmony Maker

음악 지식이 부족해도 직관적으로 **보컬 화음 악보**를 만들 수 있는 웹 애플리케이션입니다.

**▶ 라이브 데모:** https://gimseonung91-lgtm.github.io/harmony-maker/

## 주요 기능

- 🎼 **멜로디 입력** — 오선지 클릭 또는 툴바 드래그앤드롭으로 음표 배치, 드래그로 순서·높낮이 재배치
- ✏️ **드롭으로 교체** — 기존 음표 위에 타일을 가져다 놓으면 그 음표가 바로 수정됨 (삭제 후 재입력 불필요)
- 🎶 **화음 자동 생성** — 버튼 한 번으로 3도/5도 다이아토닉 화성을 독립된 오선지 줄로 생성
- 📄 **MusicXML 임포트** — MuseScore 등에서 내보낸 악보를 시스템(단) 단위로 분리해 불러오기 + 조성/박자 자동 감지
- 🎤 **보컬 파트 자동 추출** — 보컬+피아노 악보에서 피아노 반주 보표는 버리고 맨 위 보컬 라인만 가져오기
- 🖊️ **임포트 라인 편집** — 인식된 보컬 라인을 멜로디 편집기로 불러와 자유롭게 수정
- 📏 **박자 설정 + 마디선** — 헤더에서 조성/박자를 바로 바꾸면 마디선이 박자에 맞춰 렌더
- 💾 **자동 저장 & 실행 취소** — 새로고침해도 작업 유지, Ctrl+Z로 편집 되돌리기
- 🔊 **재생 & 음원 다운로드** — Tone.js 다중 트랙 재생, 트랙별 음소거, WAV/WebM 내보내기
- 🖨️ **PDF 내보내기** — 작성한 모든 줄을 A4 PDF로 저장
- ✏️ 가사 입력, 쉼표, 이음줄(tie), 자동 빔(beam), 점음표(점2분·점4분·점8분·점16분), 숫자키(1~9) 음길이 전환 — `6`~`9` = 점음표
- 📱 **반응형** — 데스크톱은 고정 사이드바, 태블릿(<1024px)은 우측 오버레이, 모바일(<768px)은 하단 시트로 도구함이 전환

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React 18 + Vite 6, Zustand, VexFlow(악보 렌더), Tone.js(오디오), @dnd-kit(드래그앤드롭), jsPDF |
| 배포 | GitHub Pages (GitHub Actions 자동 배포) |

## 로컬 실행

```bash
# 프론트엔드
npm install
npm run dev
# → http://localhost:5173/harmony-maker/  (끝의 /harmony-maker/ 경로 필수)

# 테스트 / 품질 게이트
npm test               # Vitest 단위·컴포넌트 테스트
npm run test:coverage  # 커버리지 리포트
npm run check:modules  # 모듈 크기 한도 검사 (App≤180, Toolbar≤120, 기타≤250 논리줄)
npm run build:budget   # 빌드 + eager 번들 예산 검사 (Tone/jsPDF/html2canvas 지연 로딩 강제)

```
사진/스캔 악보 인식 기능은 정확도가 낮고 유료 백엔드 비용 부담이 있어 제거했습니다.
악보를 가져오려면 MuseScore 등에서 `.musicxml`로 내보낸 뒤 업로드하세요.

## 프로젝트 구조

```
src/
├─ App.jsx                  # 레이아웃, 헤더 컨트롤, DnD, 재생/다운로드
├─ store/useHarmonyStore.js # Zustand 전역 상태 (멜로디/화성/임포트 라인)
├─ hooks/useVexFlow.js      # VexFlow 오선지 렌더 훅
├─ components/              # 캔버스, 툴바, 라인 카드 UI
└─ utils/                   # 화성 계산, MusicXML 파서, 오디오, PDF
```

자세한 기술 명세와 진행 상황은 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)를 참고하세요.
