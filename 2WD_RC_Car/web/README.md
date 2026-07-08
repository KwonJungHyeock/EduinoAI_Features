# web — 2WD RC카 코스 웹앱 (Vercel 배포용)

배선 설정에 맞춰 **아두이노 코드가 자동 생성**되는 단계별 교육 웹앱.
빌드 과정이 없는 **정적 사이트**(순수 HTML/CSS/JS ES모듈)라 Vercel/AWS에 그대로 올리거나
iframe으로 임베드하기 쉽습니다.

## 구성
```
web/
├─ index.html        화면
├─ style.css         스타일
├─ app.js            UI 로직 (설정 패널·단계·코드 뷰어)
├─ codegen.mjs       ⭐ 코드 생성 엔진 (단일 소스: 브라우저+Node 공용)
└─ gen-sketches.mjs  Node 스크립트: codegen으로 ../NN_*/NN_*.ino 재생성
```

## 핵심 기능
- **내 배선 설정** → BT RX/TX 스왑, 초음파 Trig/Echo, 모터 좌/우 포트·정역 **반전**, 속도·정지거리
- 설정을 바꾸면 각 단계 **코드가 실시간 재생성** (핀 중복은 경고)
- 코드 **복사 / .ino 다운로드**
- HC-06 / HM-10, 안드로이드 / 아이폰 연결 가이드 내장

## 로컬 미리보기
ES 모듈이라 `file://` 더블클릭은 안 됨(브라우저 CORS). 간단 서버로 열기:
```bash
# 아무거나 하나
npx serve 2WD_RC_Car/web
python -m http.server 8000 -d 2WD_RC_Car/web   # http://localhost:8000
```

## Vercel 배포
1. GitHub 저장소를 Vercel에 Import
2. **Root Directory** = `2WD_RC_Car/web`
3. Framework Preset = **Other**, Build Command 비움, Output = 그대로(정적)
4. Deploy → 발급된 URL로 확인

> 정적 파일만 서빙하므로 별도 빌드 설정이 필요 없습니다.

## 코드/스케치 동기화
`codegen.mjs`가 **웹 미리보기와 저장소 .ino의 공통 소스**입니다.
생성 로직을 바꾼 뒤 아래를 실행하면 `.ino` 파일들이 갱신됩니다:
```bash
node 2WD_RC_Car/web/gen-sketches.mjs
```
