# Eduino — 2WD RC카 블루투스 피지컬 코딩 코스

배선을 설정하면 **아두이노 코드가 자동 생성**되는 단계별 교육 웹앱 + 아두이노 스케치.
(HC-06 / HM-10 블루투스 · L293D 모터쉴드 · HC-SR04 초음파)

## 구조
```
/ (저장소 루트 = 웹앱, Vercel이 여기서 index.html을 서빙)
├─ index.html / style.css / app.js
├─ codegen.mjs        코드 생성 엔진 (웹·Node 공용 단일 소스)
├─ gen-sketches.mjs   .ino 재생성 스크립트
└─ 2WD_RC_Car/        코스 자료 + 생성된 스케치
    ├─ README.md      (기획서/커리큘럼)
    ├─ docs/배선도.md
    └─ 01_bt_echo/ … 07_safe_drive/   (단계별 .ino)
```

## Vercel 배포 (설정 불필요)
`index.html`이 **저장소 루트**에 있으므로 별도 설정 없이 배포됩니다.
- Vercel에서 Import → Framework **Other** → **Root Directory 비움(기본값)** → Deploy
- 이미 배포된 프로젝트라면: **Settings → Build & Deployment → Root Directory** 값이
  비어 있는지 확인(예전에 `2WD_RC_Car/web` 로 잡아뒀다면 지우기) → **Redeploy**

## 로컬 미리보기
ES 모듈이라 파일 더블클릭(file://)은 막힘. 간단 서버로 열기:
```bash
npx serve .
# 또는
python -m http.server 8000    # http://localhost:8000
```

## 웹앱 = 저장소 .ino 동기화
`codegen.mjs`가 웹 미리보기와 `2WD_RC_Car/*/*.ino`의 **공통 소스**입니다.
생성 로직을 바꾼 뒤:
```bash
node gen-sketches.mjs
```

자세한 커리큘럼·배선·트러블슈팅은 [`2WD_RC_Car/README.md`](2WD_RC_Car/README.md) 참고.
