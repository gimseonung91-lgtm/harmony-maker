# Harmony Maker — 프로젝트 상태 및 기술 명세 통합 문서

> 새 채팅/세션에서 작업을 이어가기 위한 컨텍스트 문서. 최종 업데이트: 2026-06-19

---

## 1. 프로젝트 개요

**Harmony Maker** 는 음악 지식이 부족한 사용자도 직관적으로 **보컬 화음 악보**를 제작할 수 있는 웹 애플리케이션이다.

핵심 비즈니스 로직:
- 사용자가 메인 **멜로디 한 줄**을 드래그앤드롭/클릭으로 입력
- 버튼 클릭 시 멜로디로부터 **3도 / 5도 다이아토닉 화성**을 *독립된 별도 오선지 줄*로 자동 생성
- 악보 이미지(사진/스캔) 또는 MusicXML을 업로드하면 **원본 단(System) 단위로 분리**되어 여러 오선지로 렌더
- 작성한 악보를 **Tone.js 신스로 재생**하고, 활성 트랙만 **WAV/WebM 음원으로 다운로드**
- PDF로 내보내기

상태(State)와 뷰(View)를 분리하고, D&D 진행 중 좌표는 로컬, 확정 시 음악 데이터(Pitch/Duration)로 역산출해 전역 상태에 반영하는 구조.

배포:
- **프론트엔드(라이브):** https://gimseonung91-lgtm.github.io/harmony-maker/ (GitHub Pages, push 시 자동 배포)
- **GitHub 레포:** `gimseonung91-lgtm/harmony-maker` (public, 기본 브랜치 `main`)
- **OMR 백엔드(라이브):** https://sunx2g-harmony-maker-omr.hf.space (Hugging Face Spaces, Docker)

---

## 2. 기술 스택 및 환경

### 프론트엔드
- **언어/런타임:** JavaScript (ES modules), Node.js v24, npm 11
- **프레임워크:** React 18.3 + Vite 6
- **상태관리:** Zustand 5
- **악보 렌더링:** VexFlow 4.2.5 (동적 import)
- **드래그앤드롭:** @dnd-kit/core 6 + @dnd-kit/utilities
- **오디오:** Tone.js 15 (PolySynth, Transport, Part, Recorder)
- **PDF:** jsPDF 2.5 + html2canvas 1.4

### 백엔드 (이미지 OMR 전용)
- **언어:** Python 3.11
- **프레임워크:** FastAPI + Uvicorn
- **OMR 엔진:** oemer 0.1.8 (onnxruntime-gpu → CPU 폴백)
- **이미지 처리:** opencv-python-headless, numpy
- **컨테이너:** Docker (HF Spaces SDK=docker, 포트 7860)

### 개발 환경
- **OS:** Windows 11 (PowerShell / cmd / Git Bash)
- **Python 실행:** `py -3.11` 런처 사용 (`python`은 스토어 스텁이라 사용 금지)
- **로컬 백엔드 URL 주입:** 루트 `.env.local`의 `VITE_OMR_BACKEND_URL`
- **배포 빌드 시 백엔드 URL:** GitHub Actions 변수 `OMR_BACKEND_URL` (이미 `https://sunx2g-harmony-maker-omr.hf.space`로 설정됨)

### 로컬 실행 방법
```bash
# ① 백엔드 (이미지 OMR 사용 시)
cd backend
py -3.11 -m uvicorn app:app --port 7860

# ② 프론트엔드
npm run dev
# 접속: http://localhost:5173/harmony-maker/   ← 끝의 /harmony-maker/ 필수
```

---

## 3. 디렉토리 / 파일 구조

```
악보 생성 프로그램/
├─ index.html
├─ package.json
├─ vite.config.js                # base: '/harmony-maker/' (GitHub Pages용)
├─ .env.example                  # VITE_OMR_BACKEND_URL 예시
├─ .env.local                    # (gitignore) 로컬 백엔드 URL
├─ .github/workflows/deploy.yml  # GitHub Pages 자동 배포 (OMR_BACKEND_URL 주입)
├─ .claude/launch.json           # preview 서버 설정
├─ backend/                      # 이미지 OMR 백엔드 (HF Spaces로 배포)
│  ├─ app.py                     # FastAPI: POST /omr, GET /
│  ├─ preprocess.py              # 이미지 전처리(deskew/조명/리사이즈)
│  ├─ requirements.txt           # oemer, fastapi, uvicorn, opencv-headless, numpy
│  ├─ Dockerfile                 # python:3.11-slim, uid 1000, 포트 7860
│  └─ README.md                  # HF Space frontmatter(sdk: docker, app_port: 7860)
└─ src/
   ├─ main.jsx                   # React 진입점
   ├─ App.jsx                    # 레이아웃, 헤더 컨트롤, DnD 컨텍스트, 키보드, 재생/다운로드
   ├─ store/
   │  └─ useHarmonyStore.js      # Zustand 전역 스토어 (핵심)
   ├─ hooks/
   │  └─ useVexFlow.js           # VexFlow 단일 라인 렌더 훅
   ├─ components/
   │  ├─ Canvas/
   │  │  ├─ DropCanvas.jsx       # 편집 가능한 멜로디 캔버스(드롭/클릭/핸들/가사)
   │  │  └─ ScoreCanvas.jsx      # 읽기전용 라인 렌더(화성/임포트 줄)
   │  ├─ Toolbar/
   │  │  ├─ Toolbar.jsx          # 우측 도구함(Notes/Import/Settings 탭)
   │  │  └─ DraggableNote.jsx    # 음표/쉼표 드래그 타일
   │  ├─ ImportedLines/
   │  │  └─ ImportedLines.jsx    # 임포트된 다중 라인(토글/이동/분리/삭제)
   │  ├─ SavedLines/
   │  │  └─ DerivedLines.jsx     # 3/5도 화성 라인 렌더(토글/삭제)
   │  └─ TrackToggle.jsx         # 🔊/🔇 음소거 토글 버튼
   ├─ utils/
   │  ├─ harmonyLogic.js         # 다이아토닉 3/5도 화성 계산
   │  ├─ musicxml.js             # MusicXML → 라인 배열 파서
   │  ├─ omr.js                  # 이미지 업로드 → 백엔드 호출/샘플 폴백
   │  ├─ audioEngine.js          # Tone.js 재생 + WAV/WebM 렌더
   │  ├─ pitchUtils.js           # 피치/길이/Y좌표 변환
   │  └─ pdfExport.js            # 오선지 캡처 → PDF
   └─ styles/
      └─ globals.css             # 다크 테마 CSS 변수
```

임시(추적 안 됨): `C:\Users\User\Desktop\hf-omr` — HF Space git 클론(백엔드 배포 관리용).

---

## 4. 상세 기술 명세

### 4.1 데이터 모델 (음표 객체)
```js
{
  id: string,            // "note_…" / "imp_…" / "h_…"
  type: 'note' | 'rest',
  pitch: string | null,  // "C4", "F#4", "Bb4" (rest면 null)
  duration: 'w'|'h'|'q'|'8'|'16',
  tie: boolean,          // 다음 음표로 붙임줄
  lyric?: string,        // 가사 (멜로디 음표)
  measure?: number,      // 임포트 라인의 마디 인덱스 (분리용)
}
```

### 4.2 전역 스토어 — `useHarmonyStore.js` (Zustand, `create((set, get) => …)`)
**상태:**
- `projectInfo`: `{ title, keySignature, clef, timeSignature }`
- `melody`: 음표[] — 편집 가능한 메인 라인 (DnD/클릭 대상)
- `derivedLines`: `[{ id, type:'3rd_harmony'|'5th_harmony', notes[] }]`
- `importedLines`: `[{ id, notes[] }]` — OMR/MusicXML 임포트 (시스템 단위)
- `enabledTracks`: `{ [trackId]: boolean }` — 'melody' + 각 라인 id, 재생 음소거 상태
- `isPlaying`, `bpm`(기본 90)
- `notePositions`: `[{id, x}]` — VexFlow가 보고한 멜로디 음표 X좌표(재정렬/가사 정렬용)
- `selectedNoteId`: 선택된 멜로디 음표(숫자키 길이 변경 대상)
- `toolbarOpen`, `activeCategory`, `selectedDuration`

**주요 액션 (파라미터 → 효과):**
- `addNoteAt(noteData, index?)` — index 위치에 삽입(생략 시 끝). `addNote`는 이를 append 호출
- `moveNote(id, index, pitch?)` — 음표를 빼서 index에 재삽입 + 피치 변경(재정렬 핵심)
- `setNoteDuration(id, duration)`, `setLyric(id, lyric)`, `toggleTie(id)`, `removeNote(id)`
- `selectNote(id)` — 토글 선택, `setNotePositions(positions)`
- `setMelody(notes)` — 멜로디 일괄 교체
- `generateHarmony('3rd'|'5th')` — melody → harmonize()로 화성 라인 생성/교체(같은 type이면 갱신), enabledTracks 등록
- `setImportedLines(lines)` — `[{lineId,notes}]`를 importedLines로 매핑(id 새로 부여)+enabledTracks 등록
- `removeLine(id)`, `moveLine(id,'up'|'down')`(스왑), `splitLine(id)`(measure별로 한 줄씩 분해)
- `removeDerivedLine(id)`, `toggleTrack(id)`, `setBpm`, `setIsPlaying`, `clearAll`
- (개발용) `window.__harmonyStore`에 노출(import.meta.env.DEV)

### 4.3 `harmonyLogic.js`
- `computeHarmony(pitch, key) → [3도, 5도]` — 다이아토닉 스케일에서 +2, +4 스케일 степ
- `harmonize(pitch, key, '3rd'|'5th') → string|null` — 단일 음정 반환
- 키 루트/메이저 인터벌 테이블 기반, 옥타브 넘김 처리.

### 4.4 `useVexFlow.js`
- 시그니처: `useVexFlow(notes, projectInfo, onLayout?) → { containerRef }`
- 단일 오선지에 음표/쉼표 렌더, **8분음표 자동 Beam**, **StaveTie**(tie 인접 음표), **Annotation**(가사) 처리
- 그린 후 `onLayout([{id, x}])` 콜백으로 음표 X좌표 보고(멜로디 캔버스만 사용)
- StrictMode 비동기 경쟁 가드(`cancelled`) 포함

### 4.5 `musicxml.js`
- `parseMusicXML(xmlText) → [{ lineId, notes[] }]`
- 시스템 분리: `<print new-system="yes">` 마커 있으면 그 기준, 없으면 **4마디(`MEASURES_PER_LINE`)씩** 한 줄
- 각 음표에 `measure` 인덱스 태깅(splitLine용). 화음(chord) 멤버는 제외해 단성부 유지. `<alter>` → #/b 처리.

### 4.6 `omr.js`
- `analyzeScoreImage(file) → { lines, usedBackend }`
- `VITE_OMR_BACKEND_URL` 있으면 `POST {url}/omr` (multipart `file`) → 반환 MusicXML을 `parseMusicXML`로 파싱
- 없으면 샘플 라인 반환(폴백). `hasOmrBackend()` 제공.

### 4.7 `audioEngine.js`
- `notesToEvents(notes) → { events:[{time,note,duration}], totalBeats }` — 누적 박자, 쉼표 시간전진, **타이 길이 병합**
- 트랙별 `Tone.PolySynth(triangle)` → 공용 `masterGain` → Destination
- `play(tracks, bpm, onEnd)` — Transport + 트랙별 Part, 종료 시 onEnd
- `stop()`
- `renderMix(tracks, bpm) → Blob(webm)` — masterGain에 `Tone.Recorder` 연결, play 재사용, 실시간 녹음
- `renderWav(tracks, bpm) → Blob(wav)` — renderMix WebM을 decodeAudioData → 16bit PCM WAV 인코딩

### 4.8 컴포넌트
- **App.jsx**: 헤더(키/조표/박자 칩, ▶Play/■Stop, BPM, ⤓WAV/⤓WebM, Clear, +3rd/+5th Harmony, Export PDF, 도구함 토글). `DndContext`의 `handleDragEnd`에서 **드롭 X→삽입 인덱스, Y→피치** 계산해 `addNoteAt`/`moveNote`. 전역 keydown(1=w,2=h,3=q,4=8,5=16; 선택 음표 있으면 그 길이, 없으면 selectedDuration; input 포커스 시 무시). `enabledTrackList()` 헬퍼로 재생/다운로드 공유. `STAFF_TOP_OFFSET` export.
- **DropCanvas.jsx**: 멜로디 캔버스. 빈 영역 클릭→해당 피치 삽입, 음표 위 투명 **드래그 핸들**(useDraggable, `kind:'reposition'`), 클릭 시 선택, 음표별 ✕/⌒ 칩, 음표 X에 정렬된 **가사 입력 행**. `useVexFlow(melody, projectInfo, setNotePositions)`.
- **ScoreCanvas.jsx**: 읽기전용 `useVexFlow` 래퍼. `id` prop으로 PDF 캡처 대상 지정.
- **ImportedLines.jsx / DerivedLines.jsx**: 라인별 카드(🔊 토글, 라벨, 이동/분리/삭제 또는 삭제). `id={imported_line_…}` / `derived_line_…`.
- **Toolbar.jsx**: Notes(길이 선택+옥타브별 음표+쉼표 타일), Import(MusicXML 업로드 / 이미지 업로드+상태 메시지), Settings(title/key/clef/time).

### 4.9 백엔드 API — `backend/app.py`
- `GET /` → `{"status":"ok","service":"harmony-maker-omr"}`
- `POST /omr` (multipart `file`) → **MusicXML 텍스트**(PlainText) 반환
  - 임시 dir 저장 시 **ASCII 파일명**(`input.png`)으로 — 한글 경로는 OpenCV/oemer가 못 읽음
  - `preprocess_image`로 전처리 후 `oemer <img> -o <tmpdir>` 실행(`timeout=600`, UTF-8 캡처)
  - 결과 `.musicxml` 읽어 반환, 처리 후 임시 dir **즉시 삭제**(`finally`)
  - 실패 시: 422(친절 메시지) / 504(타임아웃) / 전체 로그는 서버 stdout
- CORS: `allow_origins=["*"]`
- `preprocess.py`: `preprocess_image(in, out)` — 그레이스케일 + CLAHE 조명보정 + **deskew(Hough 라인 중앙값 회전)** + 1000~1500px 리사이즈. (※ 하드 이진화/디노이즈는 오선 끊김 유발로 제거됨)

### 4.10 데이터베이스
- **없음.** 영속 DB 미사용. 모든 상태는 클라이언트 메모리(Zustand). 백엔드는 무상태(stateless), 업로드 파일 즉시 삭제.

---

## 5. 현재 완료된 작업 ✅

1. **메인 레이아웃 + 다크 테마** (Center 캔버스 / Right 도구함)
2. **음표 입력**: 툴바 드래그앤드롭 + **오선지 클릭 추가** + **드래그로 순서/높낮이 재배치**(X→인덱스, Y→피치)
3. **개별 삭제(✕)**, 음표 선택, **숫자키 1~5 길이 전환**
4. **3도/5도 다이아토닉 화성** 자동 생성 → 독립 오선지 줄
5. **쉼표 / 자동 Beam / 이음표(StaveTie)** 렌더 + 재생 시 타이 길이 병합
6. **가사 입력**(Annotation 렌더 + 음표 정렬 입력행)
7. **MusicXML 임포트** → 시스템(또는 4마디) 단위 다중 라인 분리
8. **임포트 라인 제어**: 줄별 이동(↑↓)/분리(Split, 마디 단위)/삭제/음소거
9. **Tone.js 다중 트랙 재생** + 트랙별 음소거 + BPM
10. **WAV / WebM 음원 다운로드**(활성 트랙만 믹싱)
11. **PDF 내보내기**
12. **이미지 OMR 백엔드**(oemer+FastAPI) 구현, 전처리/한글파일명/임시파일삭제/친절에러 처리
13. **배포**: GitHub Pages 자동배포(Actions), HF Spaces Docker 백엔드 배포, `OMR_BACKEND_URL` 연결
14. 로컬에서 이미지 OMR end-to-end 동작 검증(샘플 악보 → 238음표 렌더)

---

## 6. 다음 진행할 작업 (TODO)

### 🔴 미해결 — 이미지 OMR 속도 (가장 중요)
- **증상:** HF **무료 CPU**에서 한 페이지 OMR이 **요청당 600초(10분) 초과** → 504 타임아웃.
  - 실측: 샘플 악보 로컬 ~220초 vs HF 무료 CPU >600초(모델 캐시 후 순수 추론도 >600초). 무료 CPU 속도가 근본 한계.
- **현재 운용:** **로컬에서 사용**(로컬 CPU는 ~220초로 충분). 라이브 사이트의 이미지 OMR은 사실상 미사용.
- **사용자 미결정(대기 중)** — 다음 중 택해 진행 필요:
  - (A) **MusicXML 임포트를 주 경로로** + 이미지 버튼에 "느림/로컬 권장" 안내 추가 (무료, 권장)
  - (B) 백엔드 `timeout`을 1200초로 늘려 그대로 사용 (15~20분 대기, fragile)
  - (C) **HF 하드웨어 유료 업그레이드**(CPU upgrade/GPU) → 수~수십 초
- ⚠️ 빌드 관련 교훈: Dockerfile에 **빌드 시 oemer 실행(warm-up) 넣으면 HF 빌더 리소스 초과로 BUILD_ERROR**. 현재는 warm-up 없이 빌드 성공, 모델은 첫 요청 때 다운로드(콜드스타트마다 재다운로드됨).

### 🟡 개선 여지 (선택)
- GitHub Actions의 Node 20 deprecation 경고 → 액션 최신 버전으로 갱신
- 4마디 한 줄이 오선지에 다소 빽빽 → 마디선/줄바꿈 렌더 개선(현재 SOFT voice, 마디선 없음)
- 가사 입력행 위치가 음표 X 기반이라 줄바꿈/스크롤 시 정렬 한계
- 로컬 실행 편의용 `.bat` 스크립트(서버 2개 동시 기동) — 사용자에게 제안만 한 상태
- 임시 클론 폴더 `hf-omr` 정리 여부 미정

### ℹ️ 백엔드 재배포 방법(관리)
```bash
# backend/ 수정 후
cp backend/{app.py,preprocess.py,requirements.txt,Dockerfile,README.md} ../hf-omr/
cd ../hf-omr && git add -A && git commit -m "..." && git push   # 인증: HF username + Write 토큰
# → HF Space 자동 재빌드(~10분). git 자격증명은 Windows Credential Manager에 저장됨.
```

---

## 7. 핵심 주의사항 (Gotchas)
- 로컬 접속은 반드시 **`/harmony-maker/`** 경로 (vite `base` 설정 때문).
- Windows에서 Python은 **`py -3.11`** 사용.
- OpenCV/oemer는 **비ASCII(한글) 경로 이미지를 못 읽음** → 백엔드가 ASCII 파일명으로 저장(처리됨).
- `onnxruntime`(CPU)과 `onnxruntime-gpu`를 **동시에 설치 금지**(충돌). oemer가 gpu를 끌어오며 CPU 폴백.
- 브라우저 자동재생 정책상 오디오는 **사용자 제스처(Play 클릭)** 이후 동작.
- 음원 다운로드는 **실시간 녹음**이라 곡 길이만큼 소요.
