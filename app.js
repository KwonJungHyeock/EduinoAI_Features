import { DEFAULT_CONFIG, FREE_PINS, validate, STEPS, generate } from "./codegen.mjs";

const $ = id => document.getElementById(id);
const cfg = { ...DEFAULT_CONFIG };

// ================= 상태 · 진도 =================
let view = "intro";      // "intro" | "ref-hw" | "ref-wire" | <stepId>
let tab = "theory";      // theory | practice | code
let sub = 0;             // practice sub-tab index
const SUBS = ["실습 주제", "배선", "실습하기", "결과 확인하기"];

const PKEY = "eduino_rc_done";
const done = new Set(JSON.parse(localStorage.getItem(PKEY) || "[]"));
const markDone = id => { if (!done.has(id)) { done.add(id); localStorage.setItem(PKEY, JSON.stringify([...done])); } };

// ================= 콘텐츠 (완전 초보 눈높이) =================
const CONCEPT = {
  1:`<p><b>블루투스</b>는 선 없이 두 기기가 대화하는 기술이에요. 우리는 <b>폰과 아두이노</b>가 서로 <b>글자</b>를
     주고받게 만들 거예요.</p>
     <p>왜 '에코'부터 하냐면 — <b>옆 그림</b>처럼 폰이 보낸 글자 <code>1</code>을 아두이노가 받아서 <b>그대로 되돌려주면</b>
     "연결이 진짜 됐다"를 눈으로 확인할 수 있거든요. 무선은 늘 여기서 시작해요.</p>
     <p>참고로 <code>HC-06</code>은 옛 방식(안드로이드용), <code>HM-10</code>은 새 방식(아이폰도 OK)이에요. 코드는 거의 같아요.</p>`,
  2:`<p><b>AT 커맨드</b>는 블루투스 모듈에게 말하는 '설정 명령어'예요. 이걸로 모듈의 <b>이름</b>과 <b>통신 속도</b>를 바꿔요.</p>
     <p><b>옆 그림</b>처럼 <code>AT+NAMEmyCar</code> 라고 입력하면, 폰의 블루투스 목록에 뜨는 이름이
     <code>HC-06</code>에서 <code>myCar</code>로 바뀝니다. 내 RC카에 이름을 붙여주는 셈이죠.</p>`,
  3:`<p>이번엔 <b>바퀴를 돌려봅니다</b>. DC모터는 전류가 흐르는 <b>방향</b>에 따라 정방향/역방향으로 돌아요.
     이 방향을 바꿔주는 것이 <b>L293D</b> 칩이에요.</p>
     <p><b>옆 그림</b>처럼 배터리 전류가 모터로 흘러 바퀴가 돌고, 속도는 <b>PWM</b>(빠르게 껐다 켰다 하는 정도)으로 정해요.
     아직 블루투스 없이 <b>움직임만</b> 확인합니다.</p>
     <p>💡 바퀴가 반대로 돌면? 설정에서 <b>‘반전’</b>만 켜면 코드가 알아서 바뀌어요.</p>`,
  4:`<p>드디어 <b>조종</b>이에요! 폰이 보낸 <b>글자 하나</b>를 <b>동작 하나</b>로 약속해요.
     이 약속을 <b>‘명령 프로토콜’</b>이라고 불러요.</p>
     <p><b>옆 그림</b>처럼 <code>F</code>=앞으로, <code>B</code>=뒤로, <code>L</code>=왼쪽, <code>R</code>=오른쪽, <code>S</code>=정지.
     아두이노는 받은 글자를 보고 해당 동작을 실행합니다.</p>`,
  5:`<p>속도를 조절해볼까요? 비결은 <b>PWM</b> — 전원을 아주 빠르게 <b>껐다 켰다</b> 하면서 '켜져 있는 비율'을 바꾸는 거예요.
     오래 켜면 빠르고, 짧게 켜면 느려요.</p>
     <p><b>옆 그림</b>의 막대가 길수록 빠른 거예요. 폰에서 <code>0</code>~<code>9</code>를 보내면 이걸 <code>0~255</code>로 바꿔
     속도에 적용합니다.</p>`,
  6:`<p>이제 RC카에 <b>눈</b>을 달아요. <b>초음파 센서</b>는 박쥐처럼 <b>소리</b>로 거리를 재요.</p>
     <p><b>옆 그림</b>처럼 소리를 <b>쏘고</b>(파랑), 벽에 맞고 <b>돌아오는</b>(초록) 시간을 재면 거리를 알 수 있어요.
     소리가 갔다가 돌아오니까 <b>시간을 2로 나눠</b> 편도 거리를 구합니다.</p>`,
  7:`<p>마지막! 지금까지 배운 걸 <b>전부 합쳐서</b> 똑똑한 RC카를 완성해요.</p>
     <p><b>옆 그림</b>처럼 앞에 장애물이 가까워지면 <b>스스로 멈춰요</b>(안전 정지). <code>A</code>를 보내면
     스스로 피해 다니는 <b>자율 모드</b>, <code>M</code>은 수동 모드예요.</p>
     <p>센서로 판단하고 스스로 멈추는 것 — 이게 <b>자율주행의 첫걸음</b>이에요. 완성 축하해요! 🎉</p>`,
};

// 개념 애니메이션 (SVG/SMIL — 텍스트 옆에서 눈으로 이해)
const ANIM = {
  1:`<svg viewBox="0 0 240 150" role="img" aria-label="블루투스 데이터 왕복">
      <rect x="18" y="38" width="46" height="76" rx="9" fill="#1f2430"/><rect x="24" y="46" width="34" height="54" rx="3" fill="#2f6bff" opacity=".85"/>
      <text x="41" y="130" text-anchor="middle" font-size="12" fill="#1f2430" font-weight="700">폰</text>
      <rect x="176" y="46" width="52" height="60" rx="7" fill="#1f8a70"/><text x="202" y="80" text-anchor="middle" font-size="12" fill="#fff" font-weight="800">UNO</text>
      <text x="202" y="130" text-anchor="middle" font-size="12" fill="#1f2430" font-weight="700">아두이노</text>
      <g><circle r="12" cy="62" fill="#f2555a"/><text y="66" text-anchor="middle" font-size="13" fill="#fff" font-weight="800">1</text>
        <animateTransform attributeName="transform" type="translate" values="72,0;168,0;168,0" keyTimes="0;0.45;1" dur="2.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.1;0.4;0.5;1" dur="2.8s" repeatCount="indefinite"/></g>
      <g><circle r="12" cy="90" fill="#22a06b"/><text y="94" text-anchor="middle" font-size="11" fill="#fff" font-weight="800">↩</text>
        <animateTransform attributeName="transform" type="translate" values="168,0;168,0;72,0" keyTimes="0;0.5;1" dur="2.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.5;0.6;0.9;1" dur="2.8s" repeatCount="indefinite"/></g></svg>`,
  2:`<svg viewBox="0 0 240 150" role="img" aria-label="AT 커맨드로 이름 변경">
      <rect x="20" y="22" width="200" height="32" rx="7" fill="#0f1728"/>
      <text x="30" y="43" font-size="13" fill="#7fd8c4" font-family="monospace">AT+NAME</text>
      <text x="98" y="43" font-size="13" fill="#fff" font-family="monospace" font-weight="700">myCar</text>
      <rect x="150" y="31" width="7" height="15" fill="#fff"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></rect>
      <rect x="66" y="72" width="108" height="54" rx="9" fill="#2f6bff"/><text x="120" y="96" text-anchor="middle" font-size="13" fill="#fff" font-weight="800">BT 모듈</text>
      <text x="120" y="116" text-anchor="middle" font-size="12" fill="#dbe4ff">이름: HC-06<animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.4;0.5;0.9;1" dur="3s" repeatCount="indefinite"/></text>
      <text x="120" y="116" text-anchor="middle" font-size="12" fill="#ffd95a" font-weight="800">이름: myCar<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.4;0.5;0.9;1" dur="3s" repeatCount="indefinite"/></text></svg>`,
  3:`<svg viewBox="0 0 240 150" role="img" aria-label="모터 회전">
      <rect x="150" y="58" width="58" height="34" rx="5" fill="#f4a723"/><rect x="208" y="68" width="6" height="14" fill="#f4a723"/>
      <text x="179" y="80" text-anchor="middle" font-size="12" fill="#3a2a00" font-weight="800">배터리</text>
      <path d="M150 75 H120" stroke="#f2555a" stroke-width="3" fill="none"/>
      <g transform="translate(78,78)"><circle r="42" fill="#1f2430"/><circle r="15" fill="#3a4453"/>
        <g stroke="#8a93a6" stroke-width="5" stroke-linecap="round">
          <line y1="-40" y2="-20"/><line y1="20" y2="40"/><line x1="-40" x2="-20"/><line x1="20" x2="40"/>
          <line x1="-28" y1="-28" x2="-14" y2="-14"/><line x1="14" y1="14" x2="28" y2="28"/><line x1="28" y1="-28" x2="14" y2="-14"/><line x1="-14" y1="14" x2="-28" y2="28"/>
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.5s" repeatCount="indefinite"/></g></g>
      <text x="78" y="140" text-anchor="middle" font-size="12" fill="#1f2430" font-weight="700">바퀴가 돈다</text></svg>`,
  4:`<svg viewBox="0 0 240 150" role="img" aria-label="명령 문자로 주행">
      <text x="120" y="24" text-anchor="middle" font-size="15" font-weight="800" fill="#1f2430">F<animate attributeName="fill" values="#c9ced8;#f2555a;#c9ced8" keyTimes="0;0.12;0.28" dur="4s" repeatCount="indefinite"/></text>
      <text x="24" y="82" text-anchor="middle" font-size="15" font-weight="800" fill="#1f2430">L<animate attributeName="fill" values="#c9ced8;#c9ced8;#f2555a;#c9ced8" keyTimes="0;0.4;0.5;0.62" dur="4s" repeatCount="indefinite"/></text>
      <text x="216" y="82" text-anchor="middle" font-size="15" font-weight="800" fill="#1f2430">R<animate attributeName="fill" values="#c9ced8;#c9ced8;#f2555a;#c9ced8" keyTimes="0;0.65;0.75;0.87" dur="4s" repeatCount="indefinite"/></text>
      <text x="120" y="142" text-anchor="middle" font-size="15" font-weight="800" fill="#1f2430">B<animate attributeName="fill" values="#c9ced8;#c9ced8;#f2555a;#c9ced8" keyTimes="0;0.28;0.38;0.5" dur="4s" repeatCount="indefinite"/></text>
      <g><rect x="-17" y="-23" width="34" height="46" rx="8" fill="#f2555a"/><rect x="-11" y="-17" width="22" height="15" rx="3" fill="#ffd7d9"/>
        <animateTransform attributeName="transform" type="translate" values="120,80;120,58;120,80;96,80;120,80;144,80;120,80" keyTimes="0;0.13;0.28;0.5;0.62;0.75;1" dur="4s" repeatCount="indefinite"/></g></svg>`,
  5:`<svg viewBox="0 0 240 150" role="img" aria-label="PWM 속도 조절">
      <text x="24" y="30" font-size="12" fill="#1f2430" font-weight="700">속도 (PWM)</text>
      <rect x="24" y="40" width="192" height="24" rx="6" fill="#e9ebf1"/>
      <rect x="24" y="40" height="24" rx="6" fill="#2f6bff"><animate attributeName="width" values="34;188;34" dur="3s" repeatCount="indefinite"/></rect>
      <text x="30" y="86" font-size="11" fill="#8a93a6">느림</text><text x="188" y="86" font-size="11" fill="#8a93a6">빠름</text>
      <g transform="translate(120,128)"><path d="M-46 0 A46 46 0 0 1 46 0" fill="none" stroke="#e9ebf1" stroke-width="8"/>
        <line y2="-40" stroke="#f2555a" stroke-width="5" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="-72;72;-72" dur="3s" repeatCount="indefinite"/></line></g></svg>`,
  6:`<svg viewBox="0 0 240 150" role="img" aria-label="초음파 거리 측정">
      <rect x="14" y="54" width="46" height="42" rx="6" fill="#1f8a70"/><circle cx="27" cy="75" r="8" fill="#0f1728"/><circle cx="47" cy="75" r="8" fill="#0f1728"/>
      <text x="37" y="112" text-anchor="middle" font-size="11" fill="#1f2430" font-weight="700">센서</text>
      <rect x="200" y="34" width="16" height="84" rx="3" fill="#8a93a6"/><text x="208" y="130" text-anchor="middle" font-size="11" fill="#1f2430">벽</text>
      <circle cy="75" r="7" fill="none" stroke="#2f6bff" stroke-width="3"><animate attributeName="cx" values="62;196;196" keyTimes="0;0.45;1" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.44;0.46;1" dur="2.6s" repeatCount="indefinite"/></circle>
      <circle cy="75" r="7" fill="none" stroke="#22a06b" stroke-width="3"><animate attributeName="cx" values="196;196;62" keyTimes="0;0.5;1" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.5;0.55;0.95;1" dur="2.6s" repeatCount="indefinite"/></circle>
      <text x="120" y="26" text-anchor="middle" font-size="12" fill="#2f6bff" font-weight="800">소리로 거리 재기</text></svg>`,
  7:`<svg viewBox="0 0 240 150" role="img" aria-label="장애물 앞 자동 정지">
      <rect x="204" y="40" width="16" height="82" rx="3" fill="#8a93a6"/><text x="212" y="134" text-anchor="middle" font-size="11" fill="#1f2430">벽</text>
      <g><rect x="0" y="72" width="48" height="28" rx="6" fill="#f2555a"/><rect x="6" y="77" width="20" height="12" rx="2" fill="#ffd7d9"/><circle cx="13" cy="102" r="7" fill="#1f2430"/><circle cx="35" cy="102" r="7" fill="#1f2430"/>
        <animateTransform attributeName="transform" type="translate" values="8,0;128,0;128,0;8,0" keyTimes="0;0.5;0.8;1" dur="3.4s" repeatCount="indefinite"/></g>
      <text x="150" y="52" text-anchor="middle" font-size="14" font-weight="800" fill="#f2555a">STOP!<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.45;0.5;0.78;0.82;1" dur="3.4s" repeatCount="indefinite"/></text>
      <text x="120" y="138" text-anchor="middle" font-size="12" fill="#1f2430" font-weight="700">가까워지면 스스로 멈춤</text></svg>`,
  arduino:`<svg viewBox="0 0 240 150" role="img" aria-label="아두이노와 LED">
      <rect x="40" y="46" width="160" height="70" rx="8" fill="#1f8a70"/><text x="120" y="70" text-anchor="middle" font-size="13" fill="#fff" font-weight="800">Arduino Uno</text>
      <g><rect x="60" y="50" width="6" height="8" fill="#0f1728"/><rect x="72" y="50" width="6" height="8" fill="#0f1728"/><rect x="84" y="50" width="6" height="8" fill="#0f1728"/><rect x="96" y="50" width="6" height="8" fill="#0f1728"/></g>
      <circle cx="160" cy="98" r="9" fill="#f2555a"><animate attributeName="opacity" values="1;0.15;1" dur="1.2s" repeatCount="indefinite"/></circle>
      <text x="120" y="134" text-anchor="middle" font-size="12" fill="#1f2430" font-weight="700">코드를 넣으면 그대로 동작해요</text></svg>`,
};
const ANIM_CAP = {
  1:"폰이 보낸 글자를 아두이노가 되돌려줘요(에코)",
  2:"AT 명령으로 모듈 이름이 바뀌어요",
  3:"배터리 전류로 바퀴가 돌아가요",
  4:"글자 하나 = 동작 하나",
  5:"켜진 비율(막대)이 길수록 빨라요",
  6:"소리가 갔다가 돌아온 시간 = 거리",
  7:"장애물 앞에서 스스로 멈춰요",
  arduino:"작은 컴퓨터 보드예요",
};

// 교사용 수업 도구: 핵심 한 줄 정리 · 핵심 용어 · 발문 · 확인 퀴즈
const TEACH = {
  1:{ key:"무선 조종의 첫걸음은 '글자 하나를 주고받는' 것이다.",
      terms:[["SPP","Classic 블루투스의 시리얼 방식(HC-06)"],["BLE","저전력 블루투스, 아이폰도 지원(HM-10)"],
             ["SoftwareSerial","일반 핀에서 시리얼 통신을 흉내내는 기능"],["에코","받은 데이터를 그대로 되돌려 보내기"]],
      ask:["블루투스는 왜 선이 없는데도 데이터를 주고받을 수 있을까요?","보낸 글자가 되돌아오지 않으면 어디를 의심해야 할까요?"],
      quiz:{q:"HC-06은 어떤 통신 방식일까요?",o:["Bluetooth Classic(SPP)","Bluetooth LE","Wi-Fi","적외선"],a:0,e:"HC-06은 Classic(SPP)이라 아이폰 연결은 안 됩니다."} },
  2:{ key:"AT 커맨드는 모듈에게 내리는 '설정 명령어'다.",
      terms:[["AT 커맨드","모듈 설정을 바꾸는 명령"],["baud","통신 속도(초당 비트 수)"],["슬레이브","연결을 받아들이는 역할"]],
      ask:["모듈 이름을 바꾸면 폰에서 무엇이 달라질까요?","통신 속도를 바꾸면 코드의 어디를 함께 고쳐야 할까요?"],
      quiz:{q:"HC-06에서 AT 명령이 동작하는 조건은?",o:["폰과 연결된 상태","폰과 연결 안 된 상태","전원을 끈 상태","모터가 도는 중"],a:1,e:"HC-06은 연결되지 않은 상태에서만 AT에 응답합니다."} },
  3:{ key:"모터의 방향은 전류의 방향, 속도는 PWM으로 정한다.",
      terms:[["H-브리지","전류 방향을 바꿔 정/역회전시키는 회로"],["L293D","모터를 구동하는 드라이버 칩"],["PWM","켜짐 비율로 평균 전력을 조절"]],
      ask:["바퀴가 반대로 돈다면 배선을 바꿀까요, 코드를 바꿀까요?","왜 모터는 USB가 아니라 배터리로 돌려야 할까요?"],
      quiz:{q:"모터 속도를 조절하는 방법은?",o:["전압을 PWM으로 조절","전선을 길게","자석을 추가","GND 분리"],a:0,e:"setSpeed로 PWM 듀티를 바꿔 속도를 조절합니다."} },
  4:{ key:"문자 하나 = 동작 하나, 이것이 '명령 프로토콜'이다.",
      terms:[["프로토콜","주고받는 데이터의 약속/규칙"],["파싱","받은 데이터를 해석하는 것"],["switch","값에 따라 분기하는 문법"]],
      ask:["F/B/L/R/S 말고 어떤 명령을 더 만들 수 있을까요?","여러 글자를 한 번에 보내면 어떻게 처리해야 할까요?"],
      quiz:{q:"'L' 명령이 하는 일은?",o:["전진","좌회전","정지","속도 증가"],a:1,e:"L은 좌회전(제자리 회전)입니다."} },
  5:{ key:"0~9라는 '사람의 단위'를 0~255라는 '기계의 단위'로 바꾼다.",
      terms:[["map()","한 범위 값을 다른 범위로 변환"],["듀티비","PWM에서 켜져 있는 비율"],["PWM","빠른 On/Off로 속도 제어"]],
      ask:["숫자 5는 속도 몇에 해당할까요? (0~255)","속도가 너무 낮으면 왜 바퀴가 안 돌 수 있을까요?"],
      quiz:{q:"map(5,0,9,0,255)의 결과에 가장 가까운 값은?",o:["약 141","5","255","50"],a:0,e:"5/9 × 255 ≈ 141 입니다."} },
  6:{ key:"소리가 다녀온 '시간'을 재면 '거리'가 나온다.",
      terms:[["Trig","초음파를 쏘게 하는 트리거 신호"],["Echo","반사파가 돌아온 시간만큼 HIGH"],["pulseIn()","핀이 HIGH인 시간을 재는 함수"]],
      ask:["측정값이 -1이면 무슨 뜻일까요?","왜 시간을 2로 나눠야 할까요?"],
      quiz:{q:"거리를 구할 때 시간을 2로 나누는 이유는?",o:["소리가 왕복하기 때문","센서가 2개라서","cm 단위라서","오차 보정"],a:0,e:"소리가 갔다가 돌아오므로 편도 거리는 절반입니다."} },
  7:{ key:"센서로 판단하고 스스로 멈추면, 그것이 자율주행의 시작이다.",
      terms:[["상태 기계","모드에 따라 다르게 동작하는 구조"],["자동 정지","장애물 감지 시 스스로 멈춤"],["자율 회피","막히면 스스로 방향 전환"]],
      ask:["수동 모드에도 자동 정지를 넣은 이유는 무엇일까요?","자동 회피를 더 똑똑하게 만들려면 무엇이 필요할까요?"],
      quiz:{q:"자동 정지 거리는 어디서 바꿀까요?",o:["배선 설정의 정지 거리","모터 포트","블루투스 이름","줄번호"],a:0,e:"설정의 '정지 거리(stopCm)' 값으로 조절합니다."} },
};
const quizPick = {}; // {stepId: 선택 인덱스}

const UP = { t:"코드 업로드", d:"코드를 Arduino IDE에 붙여넣고 <b>Uno</b>로 업로드. SoftwareSerial이라 BT선을 빼지 않아도 됩니다." };
const conn = () => cfg.module === "HC-06"
  ? { t:"폰 연결 (HC-06)", d:"설정&gt;블루투스에서 <code>HC-06</code> 페어링(PIN 1234) 후 <b>Serial Bluetooth Terminal</b> 앱으로 연결." }
  : { t:"폰 연결 (HM-10 · BLE)", d:"<b>LightBlue</b>/<b>nRF Connect</b> 로 스캔·연결 → 특성 <code>FFE1</code> 에 Write, Notify로 회신 수신." };

const PRAC = {
  1:{ topic:"폰과 아두이노가 블루투스로 글자를 주고받는지, LED로 명령이 실제 동작하는지 확인합니다.",
      steps:()=>[UP, conn(), {t:"글자 전송·확인", d:"앱에서 <code>1</code>/<code>0</code> → LED on/off, 아무 글자 → <code>echo:</code> 회신"}],
      alert:"블루투스 결선(모듈TX→A0, 모듈RX→A1 분압, VCC/GND)을 먼저 확인하세요.",
      tips:["시리얼 모니터·모듈 속도를 둘 다 9600으로","HC-06은 아이폰 연결 불가(Classic)","글자가 깨지면 baud 불일치"],
      resText:"폰에 <b>echo</b> 회신이 오고 LED가 <code>1</code>/<code>0</code>에 반응하면 성공입니다.",
      lines:["받음: 1","LED ON","받음: 0","LED OFF"], hl:1, cap:"에코 회신 · LED 제어 확인" },
  2:{ topic:"AT 명령으로 모듈 이름과 통신 속도를 바꿔봅니다.",
      steps:()=>[UP, {t:"시리얼 모니터 열기", d:"9600 baud로 열고 입력창 준비"}, {t:"AT 명령 입력", d:"<code>AT</code> → <code>OK</code>, <code>AT+NAMEmyCar</code> 로 이름 변경"}],
      alert:"HC-06은 폰과 연결 안 된 상태에서만, 줄바꿈 없이 전송하세요.",
      tips:["이름을 바꾸면 폰 목록에 반영","속도를 바꾸면 이후 코드의 BT.begin도 동일하게"],
      resText:"<code>AT</code>→<code>OK</code>, <code>AT+NAME…</code> 후 폰 목록에 새 이름이 보이면 성공.",
      lines:["> AT","OK","> AT+NAMEmyCar","OK+Set:myCar"], hl:3, cap:"모듈 이름 변경 확인" },
  3:{ topic:"블루투스 없이 모터가 전/후/좌/우로 도는지 확인합니다.",
      steps:()=>[{t:"전원 연결", d:"모터 배터리를 쉴드 EXT_PWR에, <b>공통 GND</b> 연결"}, UP, {t:"동작 관찰", d:"전진→후진→좌→우 데모 반복. 반대로 돌면 설정에서 <b>반전</b>"}],
      alert:"USB로 모터를 돌리지 마세요. 별도 배터리 + 공통 접지 필수.",
      tips:["바퀴 방향이 반대면 설정에서 반전","속도는 setSpeed(0~255)"],
      resText:"바퀴가 전진→후진→좌→우 순서로 반복 동작하면 성공.",
      lines:["모터 데모 시작: 전진-후진-좌-우 반복"], hl:0, cap:"모터 4방향 동작" },
  4:{ topic:"폰이 보낸 F/B/L/R/S 명령으로 실제 주행합니다.",
      steps:()=>[UP, conn(), {t:"주행", d:"<code>F/B/L/R/S</code> 전송 → 전진/후진/좌/우/정지"}],
      alert:"처음엔 바퀴를 띄운 상태로 테스트하세요(안전).",
      tips:["반대로 가면 설정에서 반전","정지는 S"],
      resText:"명령대로 주행하고 시리얼에 <code>cmd:</code> 가 찍히면 성공.",
      lines:["cmd: F","cmd: L","cmd: S"], hl:0, cap:"블루투스 주행 명령" },
  5:{ topic:"0~9 숫자로 속도(PWM)를 조절합니다.",
      steps:()=>[UP, conn(), {t:"속도 전송", d:"<code>0</code>~<code>9</code> 로 속도 단계 조절 (주행 문자와 함께)"}],
      alert:"0은 정지, 9는 최고 속도(255)입니다.",
      tips:["map()으로 0~9 → 0~255 변환","저속에서 안 돌면 기본 속도를 올려보세요"],
      resText:"숫자를 보낼 때마다 <code>speed:</code> 값이 바뀌고 속도가 달라지면 성공.",
      lines:["speed: 141","speed: 255","speed: 0"], hl:1, cap:"속도 단계 변경" },
  6:{ topic:"초음파로 거리를 재고, D 명령에 폰으로 값을 회신합니다.",
      steps:()=>[UP, {t:"시리얼 모니터", d:"1초마다 거리 자동 출력 확인"}, {t:"거리 요청", d:"앱에서 <code>D</code> → <code>distance: NN cm</code> 회신"}],
      alert:"Trig/Echo 배선과 5V/GND를 확인하세요.",
      tips:["측정 실패는 -1로 표시","벽까지 거리로 검증"],
      resText:"손을 가까이/멀리 하면 cm 값이 변하면 성공.",
      lines:["거리: 34 cm","거리: 18 cm","distance: 18 cm"], hl:2, cap:"거리 측정 · 회신" },
  7:{ topic:"모든 기능을 통합하고, 장애물 자동정지·자율 회피까지 완성합니다.",
      steps:()=>[UP, conn(), {t:"모드 전환", d:"<code>A</code>=자동(자율 회피), <code>M</code>=수동. 수동도 전진 중 근접 시 자동 정지"}],
      alert:"넓은 공간에서 테스트하세요. 바퀴 방향·센서 위치를 확인.",
      tips:["정지 거리·속도는 설정에서 조절","자동 모드는 스스로 회피 주행"],
      resText:"장애물 앞에서 스스로 멈추고, 자동 모드에서 회피하면 성공! 🎉",
      lines:["MANUAL","distance: 15 cm  (auto-stop)","AUTO"], hl:1, cap:"안전주행 · 자율 회피" },
};

// ================= 코드 하이라이트 =================
const KW=["#include","#define","if","else","for","while","switch","case","break","return","void","const",
  "static","unsigned","uint8_t","uint16_t","int","long","bool","char","true","false","default","setup","loop",
  "delay","delayMicroseconds","digitalWrite","digitalRead","pinMode","pulseIn","map","millis","HIGH","LOW",
  "OUTPUT","INPUT","INPUT_PULLUP","FORWARD","BACKWARD","RELEASE","LED_BUILTIN"];
const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function hl(code){
  const kw=KW.map(k=>k.replace(/#/g,"\\#")).join("|");
  const re=new RegExp(`(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|(#\\w+)|\\b(${kw})\\b|\\b(\\d[\\dxXa-fA-F]*[uUlL]*)\\b`,"g");
  return esc(code).replace(re,(m,c,s,p,k,n)=>c?`<span class="tok-cmt">${c}</span>`:s?`<span class="tok-str">${s}</span>`:
    p?`<span class="tok-pre">${p}</span>`:k?`<span class="tok-kw">${k}</span>`:n?`<span class="tok-num">${n}</span>`:m);
}
function codeCard(step){
  const code=generate(step.id,cfg);
  const n=code.split("\n").length;
  const gutter=Array.from({length:n},(_,i)=>`<span>${i+1}</span>`).join("");
  return `<div class="codecard">
    <div class="code-top"><div class="l"><span class="g">&lt;/&gt;</span>코드 <small>읽기 전용</small></div>
      <button class="copybtn" data-copy="${step.id}">⧉ 전체 복사</button></div>
    <div class="code-warn">⚡ Arduino IDE 전용 코드입니다. IDE에 붙여넣어 업로드하세요.</div>
    <div class="code-file"><span class="dot"></span><span class="fn">${step.folder}.ino</span></div>
    <div class="codebody"><div class="gutter">${gutter}</div><pre class="code"><code>${hl(code)}</code></pre></div>
  </div>`;
}

// ================= 배선 요약 =================
const wireSummary=()=>`BT ${cfg.module}: 모듈TX→<b>${cfg.btRx}</b>, 모듈RX→<b>${cfg.btTx}</b>(분압) · `+
  `SR04 Trig=<b>${cfg.trig}</b> Echo=<b>${cfg.echo}</b> · 모터 좌 M${cfg.motorLeft}${cfg.leftReversed?"↺":""} 우 M${cfg.motorRight}${cfg.rightReversed?"↺":""}`;

// ================= 사이드바 =================
function renderNav(){
  const groups=[
    {title:"공통 기초학습", items:[
      {id:"ref-arduino", idx:"01", ic:"🔰", label:"아두이노 첫걸음"},
      {id:"ref-setup", idx:"02", ic:"💻", label:"개발환경 준비"},
      {id:"ref-hw", idx:"03", ic:"🔧", label:"하드웨어 구성"},
      {id:"ref-wire", idx:"04", ic:"🔌", label:"배선 · 전원"}]},
    {title:"본 학습 커리큘럼", items:[
      {id:"intro", idx:"00", ic:"📖", label:"코스 소개"},
      ...STEPS.map(s=>({id:s.id, idx:String(s.id).padStart(2,"0"), ic:"", label:s.title}))]},
  ];
  const subTabs=[["theory","이론 학습"],["practice","실습하기"],["code","코드 살펴보기"]];
  $("nav").innerHTML=groups.map(g=>`<div class="nav-group">
    <div class="nav-title">${g.title}</div>
    ${g.items.map(it=>{
      const on=String(view)===String(it.id);
      const isStep=typeof it.id==="number";
      const isDone=isStep&&done.has(it.id);
      return `<div class="nav-item ${on?"on":""} ${isDone?"done":""}" data-view="${it.id}">
          <span class="idx">${it.idx}</span>${it.ic?`<span class="ic">${it.ic}</span>`:""}<span>${it.label}</span>
          <span class="chk">✓</span></div>
        ${on&&isStep?`<div class="nav-sub">${subTabs.map(([t,l])=>
          `<div class="nav-subitem ${tab===t?"on":""}" data-tab="${t}">${l}</div>`).join("")}</div>`:""}`;
    }).join("")}
  </div>`).join("");
  $("nav").querySelectorAll("[data-view]").forEach(el=>el.onclick=()=>goView(isNaN(+el.dataset.view)?el.dataset.view:+el.dataset.view));
  $("nav").querySelectorAll("[data-tab]").forEach(el=>el.onclick=e=>{e.stopPropagation();setTab(el.dataset.tab);});
}

// ================= 메인 뷰 =================
function pageHead(title){
  return `<div class="page-head"><div class="page-title">${title}</div>
    <button class="cfg-open" id="cfgOpen">⚙️ 배선 설정</button></div>`;
}
function topTabs(){
  const t=[["theory","학습목표 및 이론학습"],["practice","실습하기"],["code","코드 살펴보기"]];
  return `<div class="tabs">${t.map(([k,l])=>`<button class="tab ${tab===k?"on":""}" data-tt="${k}">${l}</button>`).join("")}</div>`;
}

function theoryHTML(step){
  const tc=TEACH[step.id]||{terms:[],ask:[],quiz:null,key:""};
  const pick=quizPick[step.id];
  const q=tc.quiz;
  const quizHTML=q?`<div class="quiz">
      <div class="ql">Q. ${q.q}</div>
      <div class="opts">${q.o.map((o,i)=>{
        let cls=""; if(pick!=null){ if(i===q.a)cls="correct"; else if(i===pick)cls="wrong"; }
        return `<button class="qopt ${cls}" data-quiz="${step.id}" data-opt="${i}" ${pick!=null?"disabled":""}>
          <span class="mk">${"ABCD"[i]}</span>${o}</button>`;}).join("")}</div>
      <div class="qexp ${pick!=null?"show":""}">✅ 정답: ${"ABCD"[q.a]}. ${q.e}</div></div>`:"";

  return `<div class="fadein">
    <div class="keyline"><span class="kic">🎯</span><span class="kt">${tc.key||step.goal}</span></div>

    <div class="card"><div class="card-h"><span class="bar"></span>학습 목표</div>
      <p>${step.goal}</p>
      <ul class="obj-list">
        <li><span class="n">1</span><div><b>${step.title}</b>의 원리와 개념을 이해한다.</div></li>
        <li><span class="n">2</span><div>코드를 업로드하고 실제 동작을 확인한다.</div></li>
        <li><span class="n">3</span><div>배선·설정을 바꿔가며 문제를 해결한다.</div></li>
      </ul></div>

    <div class="card"><div class="card-h"><span class="bar"></span>💡 이론 학습</div>
      <div class="concept">
        <div class="concept-text">${CONCEPT[step.id]||""}</div>
        <div class="concept-anim"><div class="anim-box">${ANIM[step.id]||""}</div>
          <div class="anim-cap">🎬 ${ANIM_CAP[step.id]||""}</div></div>
      </div></div>

    <div class="card"><div class="card-h"><span class="bar"></span>📌 핵심 용어</div>
      <div class="terms">${tc.terms.map(([w,d])=>`<div class="term"><div class="tw">${w}</div><div class="td">${d}</div></div>`).join("")}</div></div>

    <div class="teacher">
      <div class="th">👩‍🏫 수업 도우미<span class="tag">교사용</span></div>
      <div class="ask"><div class="al">🗣️ 이렇게 질문해 보세요</div>
        <ul>${tc.ask.map(a=>`<li>${a}</li>`).join("")}</ul></div>
      ${quizHTML}
    </div>
  </div>`;
}

function practiceHTML(step){
  const p=PRAC[step.id];
  let body="";
  if(sub===0){ // 실습 주제
    body=`<div class="card"><div class="card-h"><span class="bar"></span>실습 주제</div>
      <p>${p.topic}</p>
      <div class="tip"><div class="th">💡 이번 실습 목표</div><ul><li>${step.goal}</li></ul></div></div>`;
  } else if(sub===1){ // 배선
    body=`<div class="card"><div class="card-h"><span class="bar"></span>배선 확인</div>
      <p>현재 설정된 배선 기준입니다. 실제와 다르면 우측 상단 <b>⚙️ 배선 설정</b>에서 바꾸면 코드도 함께 바뀝니다.</p>
      <div class="wirebox">${wireSummary()}</div>
      <div class="tip"><div class="th">💡 참고</div><ul>
        <li>블루투스 RX는 5V→3.3V <b>분압(1k+2k)</b> 후 연결</li>
        <li>모터 전원은 <b>별도 배터리</b>, 아두이노와 <b>공통 GND</b></li></ul></div></div>`;
  } else if(sub===2){ // 실습하기 (코드 + 안내)
    const steps=p.steps();
    body=`<div class="prac">
      ${codeCard(step)}
      <div class="guidecard">
        <div class="guide-h"><span class="g">ⓘ</span> 실습 안내</div>
        <div class="alert">⚡ ${p.alert}</div>
        ${steps.map((s,i)=>`<div class="gstep"><div class="n">${i+1}</div>
          <div><div class="t">${s.t}</div><div class="d">${s.d}</div></div></div>`).join("")}
        <div class="tip"><div class="th">💡 참고</div><ul>${p.tips.map(t=>`<li>${t}</li>`).join("")}</ul></div>
      </div></div>`;
  } else { // 결과 확인하기
    body=`<div class="card">
      <div class="result-h"><span class="bar"></span>이렇게 동작하면 성공!</div>
      <div class="success"><span class="ck">✓</span><div>${p.resText}</div></div>
      <div class="serial">
        <div class="serial-top"><span class="tt">Serial Monitor</span><span>9600 baud</span><span class="rt">— 예상 출력</span></div>
        <div class="serial-body">${p.lines.map((l,i)=>i===p.hl?`<div><span class="hl">${esc(l)}</span></div>`:`<div>${esc(l)}</div>`).join("")}</div>
      </div>
      <div class="serial-cap">${p.cap}</div></div>`;
  }
  const pager=`<div class="pager">
    <button class="arrow" id="subPrev" ${sub===0?"disabled":""}>‹</button>
    <div class="dots">${SUBS.map((_,i)=>`<i class="${i===sub?"on":""}"></i>`).join("")}</div>
    <button class="arrow" id="subNext" ${sub===SUBS.length-1?"disabled":""}>›</button>
    <span>${sub+1} / ${SUBS.length} · ← → 키로 이동</span></div>`;
  return `<div class="fadein">
    <div class="subtabs">${SUBS.map((l,i)=>`<button class="pill ${i===sub?"on":""}" data-sub="${i}">${l}</button>`).join("")}</div>
    ${body}${pager}</div>`;
}

function codeHTML(step){
  return `<div class="fadein">
    <div class="card" style="padding:16px 18px"><div class="card-h" style="margin:0"><span class="bar"></span>
      전체 코드 — <span style="color:var(--dim);font-weight:600;font-size:13px">&nbsp;${step.folder}.ino</span></div></div>
    ${codeCard(step)}
    <div class="prac" style="margin-top:16px">
      <div class="card"><div class="card-h"><span class="bar"></span>내려받기 · 반영</div>
        <p>아래 버튼으로 <code>.ino</code> 파일을 받아 Arduino IDE에서 열 수 있어요.
           핀을 바꾸려면 <b>⚙️ 배선 설정</b>에서 조정하면 코드가 자동 반영됩니다.</p>
        <button class="copybtn" data-dl="${step.id}" style="margin-top:6px">⬇️ ${step.folder}.ino 다운로드</button></div>
      <div class="card"><div class="card-h"><span class="bar"></span>현재 배선</div>
        <div class="wirebox">${wireSummary()}</div></div>
    </div></div>`;
}

function lessonView(step){
  let content = tab==="theory"?theoryHTML(step):tab==="practice"?practiceHTML(step):codeHTML(step);
  return pageHead(step.title)+topTabs()+content+lessonNav();
}

function lessonNav(){
  const order=[...STEPS.map(s=>s.id)];
  const i=order.indexOf(view);
  const prev=i>0?order[i-1]:null, next=i<order.length-1?order[i+1]:null;
  const t=id=>STEPS.find(s=>s.id===id).title;
  return `<div class="lesson-nav">
    ${prev?`<button class="lnav" data-view="${prev}"><small>← 이전 강의</small>${t(prev)}</button>`:`<span></span>`}
    ${next?`<button class="lnav next primary" data-view="${next}"><small>다음 강의 →</small>${t(next)}</button>`:
      `<button class="lnav next primary" data-view="intro"><small>코스 완료 →</small>처음으로</button>`}</div>`;
}

// ---- 참고(공통 기초학습) 뷰 ----
function refHW(){
  return pageHead("하드웨어 구성")+`<div class="fadein">
    <div class="card"><div class="card-h"><span class="bar"></span>준비물 (BOM)</div>
      <table class="bom"><tr><th>부품</th><th>설명</th></tr>
        <tr><td><b>Arduino Uno</b></td><td>메인 보드</td></tr>
        <tr><td><b>L293D 모터쉴드</b></td><td>DC모터 4채널 · AFMotor 라이브러리</td></tr>
        <tr><td><b>DC 기어모터 ×2 + 바퀴</b></td><td>2WD 좌/우 구동</td></tr>
        <tr><td><b>HC-06 / HM-10</b></td><td>블루투스(Classic / BLE)</td></tr>
        <tr><td><b>HC-SR04 ×1</b></td><td>초음파 거리센서</td></tr>
        <tr><td><b>모터 배터리</b></td><td>6~9V (USB로 모터 구동 금지)</td></tr></table></div>
    <div class="card"><div class="card-h"><span class="bar"></span>HC-06 vs HM-10</div>
      <ul><li><b>HC-06</b> — Classic(SPP), 안드로이드 전용, 가장 쉬움</li>
      <li><b>HM-10</b> — BLE, 아이폰+안드로이드, 조금 더 복잡</li></ul>
      <div class="tip"><div class="th">💡 참고</div><ul><li>본체 코드는 두 모듈 공통(SoftwareSerial). 연결 방법만 다릅니다.</li></ul></div></div>
  </div>`;
}
function refWire(){
  return pageHead("배선 · 전원")+`<div class="fadein">
    <div class="card"><div class="card-h"><span class="bar"></span>핀 배정</div>
      <p>L293D 쉴드가 쓰는 핀(D3·D5·D6·D11 / D4·D7·D8·D12 / D9·D10)을 피해 <b>남는 핀</b>에 연결합니다.</p>
      <div class="wirebox">${wireSummary()}</div>
      <p style="margin-top:10px">우측 상단 <b>⚙️ 배선 설정</b>에서 실제 결선에 맞게 바꾸면 모든 코드에 반영됩니다.</p></div>
    <div class="card"><div class="card-h"><span class="bar"></span>전원 · 레벨시프트</div>
      <ul><li>모터 전원은 <b>별도 배터리</b>를 쉴드 EXT_PWR에 연결, 아두이노와 <b>공통 GND</b></li>
      <li>아두이노 TX(5V) → 블루투스 RX(3.3V): <b>1k+2k 분압</b></li>
      <li>블루투스를 A0/A1(SoftwareSerial)에 → 업로드 시 선 분리 불필요</li></ul></div>
  </div>`;
}

function refArduino(){
  return pageHead("아두이노 첫걸음")+`<div class="fadein">
    <div class="keyline"><span class="kic">🔰</span><span class="kt">아두이노는 '코드를 넣으면 그대로 움직이는' 작은 컴퓨터예요.</span></div>
    <div class="card"><div class="card-h"><span class="bar"></span>💡 아두이노가 뭐예요?</div>
      <div class="concept">
        <div class="concept-text">
          <p>아두이노는 손바닥만 한 <b>작은 컴퓨터 보드</b>예요. 여기에 우리가 만든 <b>코드</b>를 넣으면(업로드),
          그 명령대로 불을 켜거나 모터를 돌리거나 센서를 읽어요.</p>
          <p>보드 가장자리의 구멍들을 <b>핀</b>이라고 불러요. 여기에 부품 선을 꽂아 연결해요.
          <code>5V</code>·<code>GND</code>는 <b>전원</b>(플러스/마이너스), 나머지는 신호를 주고받는 통로예요.</p>
          <p>겁먹지 마세요! 우리는 코드를 <b>직접 안 짜도</b> 돼요. 이 페이지가 배선에 맞는 코드를 만들어 주니까,
          <b>붙여넣고 업로드</b>만 하면 됩니다.</p>
        </div>
        <div class="concept-anim"><div class="anim-box">${ANIM.arduino}</div><div class="anim-cap">🎬 ${ANIM_CAP.arduino}</div></div>
      </div></div>
    <div class="teacher"><div class="th">👩‍🏫 수업 도우미<span class="tag">교사용</span></div>
      <div class="ask"><div class="al">🗣️ 이렇게 질문해 보세요</div>
        <ul><li>우리 주변에서 '코드로 움직이는 기계'는 뭐가 있을까요?</li>
        <li>전원(+, −)을 반대로 꽂으면 어떻게 될까요?</li></ul></div></div>
  </div>`;
}
function refSetup(){
  const steps=[
    ["Arduino IDE 설치","arduino.cc에서 무료 프로그램을 내려받아 설치해요. 코드를 쓰고 아두이노에 넣는 도구예요."],
    ["보드 연결","아두이노를 USB로 컴퓨터에 연결해요."],
    ["라이브러리 설치","메뉴 <b>스케치 &gt; 라이브러리 포함 &gt; 관리</b> 에서 <code>Adafruit Motor Shield</code>(AFMotor)를 검색해 설치. (SoftwareSerial은 기본 포함)"],
    ["보드·포트 선택","<b>도구</b> 메뉴에서 보드는 <b>Arduino Uno</b>, 포트는 연결된 COM 포트를 선택."],
    ["업로드","오른쪽 위 <b>→(업로드)</b> 버튼을 누르면 코드가 아두이노로 들어가요."],
    ["시리얼 모니터 열기","<b>돋보기</b> 아이콘을 눌러 열고, 속도를 <b>9600</b>으로 맞추면 결과가 보여요."],
  ];
  return pageHead("개발환경 준비")+`<div class="fadein">
    <div class="keyline"><span class="kic">💻</span><span class="kt">딱 한 번만 준비하면, 이후엔 '붙여넣고 → 업로드'만 반복해요.</span></div>
    <div class="card"><div class="card-h"><span class="bar"></span>준비 순서</div>
      ${steps.map((s,i)=>`<div class="gstep"><div class="n">${i+1}</div>
        <div><div class="t">${s[0]}</div><div class="d">${s[1]}</div></div></div>`).join("")}
      <div class="tip"><div class="th">💡 참고</div><ul>
        <li>업로드가 안 되면 <b>보드/포트</b> 선택을 다시 확인하세요.</li>
        <li>글자가 깨지면 시리얼 모니터 속도를 <b>9600</b>으로 맞추세요.</li>
        <li>블루투스를 A0/A1에 연결하면 <b>업로드할 때 선을 안 빼도</b> 돼요.</li></ul></div></div>
  </div>`;
}

function introView(){
  return `<div class="fadein"><div class="hero">
    <div class="big">🤖🚗</div>
    <h1>2WD RC카 만들기</h1>
    <p>블루투스로 조종하는 나만의 RC카를 만들며 <b>무선 통신 · 모터 제어 · 센서</b>를 한 단계씩 배우는 코스입니다.</p>
    <div class="hwrow">
      <div class="hw">🧠 <b>Arduino Uno</b></div><div class="hw">⚙️ <b>L293D</b></div>
      <div class="hw">📶 <b>HC-06/HM-10</b></div><div class="hw">📏 <b>HC-SR04</b></div></div>
    <button class="cta" data-view="1">🚀 첫 강의 시작하기</button>
    <p style="font-size:12px;margin-top:12px;color:var(--dim)">왼쪽 커리큘럼에서 강의를 선택하세요. 진도는 자동 저장됩니다.</p>
  </div></div>`;
}

function render(){
  let html;
  if(view==="intro") html=introView();
  else if(view==="ref-arduino") html=refArduino();
  else if(view==="ref-setup") html=refSetup();
  else if(view==="ref-hw") html=refHW();
  else if(view==="ref-wire") html=refWire();
  else html=lessonView(STEPS.find(s=>s.id===view));
  $("view").innerHTML=html;
  bindView();
  renderNav();
  setToolbarTitle();
  $("mainScroll").scrollTop=0;
}

function setToolbarTitle(){
  let t;
  if(view==="intro") t="코스 소개";
  else if(view==="ref-arduino") t="공통 기초학습 · 아두이노 첫걸음";
  else if(view==="ref-setup") t="공통 기초학습 · 개발환경 준비";
  else if(view==="ref-hw") t="공통 기초학습 · 하드웨어 구성";
  else if(view==="ref-wire") t="공통 기초학습 · 배선 · 전원";
  else { const s=STEPS.find(x=>x.id===view); const tn={theory:"이론 학습",practice:"실습하기",code:"코드 살펴보기"}[tab];
    t=`본 학습 커리큘럼 · <b>${String(s.id).padStart(2,"0")} ${s.title}</b> · ${tn}`; }
  $("tbTitle").innerHTML=t;
}

function bindView(){
  const o=$("cfgOpen"); if(o) o.onclick=()=>openCfg(true);
  $("view").querySelectorAll("[data-view]").forEach(el=>el.onclick=()=>goView(isNaN(+el.dataset.view)?el.dataset.view:+el.dataset.view));
  $("view").querySelectorAll("[data-tt]").forEach(el=>el.onclick=()=>setTab(el.dataset.tt));
  $("view").querySelectorAll("[data-sub]").forEach(el=>el.onclick=()=>setSub(+el.dataset.sub));
  $("view").querySelectorAll("[data-copy]").forEach(el=>el.onclick=()=>copyCode(+el.dataset.copy));
  $("view").querySelectorAll("[data-dl]").forEach(el=>el.onclick=()=>dlCode(+el.dataset.dl));
  $("view").querySelectorAll("[data-quiz]").forEach(el=>el.onclick=()=>{
    const id=+el.dataset.quiz; if(quizPick[id]!=null)return;
    quizPick[id]=+el.dataset.opt; render();
  });
  const sp=$("subPrev"),sn=$("subNext");
  if(sp)sp.onclick=()=>setSub(sub-1); if(sn)sn.onclick=()=>setSub(sub+1);
}

function goView(v){ view=v; tab="theory"; sub=0; render(); }
function setTab(t){ tab=t; sub=0; render(); }
function setSub(i){ i=Math.max(0,Math.min(SUBS.length-1,i)); sub=i;
  if(typeof view==="number" && tab==="practice" && i===3) markDone(view);
  render(); }

// ================= 배선 설정 모달 =================
function pinSel(k){return`<select data-cfg="${k}">${FREE_PINS.map(p=>`<option value="${p}" ${cfg[k]===p?"selected":""}>${p}</option>`).join("")}</select>`;}
function portSel(k){return`<select data-cfg="${k}" data-num="1">${[1,2,3,4].map(n=>`<option value="${n}" ${cfg[k]===n?"selected":""}>M${n}</option>`).join("")}</select>`;}
function renderConfig(){
  $("config").innerHTML=`
    <div class="cfg-group">블루투스 핀</div>
    <div class="cfg-row"><label>RX (모듈 TX→)</label><div class="cfg-ctl">${pinSel("btRx")}</div></div>
    <div class="cfg-row"><label>TX (→모듈 RX)</label><div class="cfg-ctl">${pinSel("btTx")}<button class="swap" id="swBt">⇄</button></div></div>
    <div class="cfg-group">초음파 HC-SR04</div>
    <div class="cfg-row"><label>Trig</label><div class="cfg-ctl">${pinSel("trig")}</div></div>
    <div class="cfg-row"><label>Echo</label><div class="cfg-ctl">${pinSel("echo")}<button class="swap" id="swSr">⇄</button></div></div>
    <div class="cfg-group">모터 (L293D)</div>
    <div class="cfg-row"><label>좌측 포트</label><div class="cfg-ctl">${portSel("motorLeft")}
      <label class="cfg-tog"><input type="checkbox" data-cfg="leftReversed" ${cfg.leftReversed?"checked":""}/>반전</label></div></div>
    <div class="cfg-row"><label>우측 포트</label><div class="cfg-ctl">${portSel("motorRight")}
      <label class="cfg-tog"><input type="checkbox" data-cfg="rightReversed" ${cfg.rightReversed?"checked":""}/>반전</label></div></div>
    <div class="cfg-group">주행 파라미터</div>
    <div class="cfg-row"><label>기본 속도</label><div class="cfg-ctl">
      <input type="range" min="0" max="255" step="5" data-cfg="baseSpeed" data-num="1" value="${cfg.baseSpeed}"/><span class="cfg-val" id="vS">${cfg.baseSpeed}</span></div></div>
    <div class="cfg-row"><label>정지 거리</label><div class="cfg-ctl">
      <input type="range" min="5" max="80" step="1" data-cfg="stopCm" data-num="1" value="${cfg.stopCm}"/><span class="cfg-val" id="vD">${cfg.stopCm}cm</span></div></div>`;
  $("config").querySelectorAll("[data-cfg]").forEach(el=>{
    const k=el.dataset.cfg, ev=el.type==="range"?"input":"change";
    el.addEventListener(ev,()=>{let v=el.type==="checkbox"?el.checked:el.value; if(el.dataset.num)v=Number(v); cfg[k]=v;
      if(k==="baseSpeed")$("vS").textContent=v; if(k==="stopCm")$("vD").textContent=v+"cm"; onCfgChange();});
  });
  $("swBt").onclick=()=>{[cfg.btRx,cfg.btTx]=[cfg.btTx,cfg.btRx];renderConfig();onCfgChange();};
  $("swSr").onclick=()=>{[cfg.trig,cfg.echo]=[cfg.echo,cfg.trig];renderConfig();onCfgChange();};
}
function renderMod(){
  $("modPick").innerHTML=["HC-06","HM-10"].map(m=>`<button class="${cfg.module===m?"on":""}" data-mod="${m}">${m}</button>`).join("");
  $("modPick").querySelectorAll("button").forEach(b=>b.onclick=()=>{cfg.module=b.dataset.mod;renderMod();onCfgChange();});
}
function onCfgChange(){ $("errors").innerHTML=validate(cfg).map(e=>"⚠️ "+e).join("<br>"); render(); }

function openCfg(o){$("cfgModal").classList.toggle("on",o);$("cfgBack").classList.toggle("on",o);}

// ================= 복사/다운로드 =================
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),1400);}
async function copyCode(id){try{await navigator.clipboard.writeText(generate(id,cfg));toast("코드를 복사했어요");}catch{toast("복사 실패 — 직접 선택하세요");}}
function dlCode(id){const s=STEPS.find(x=>x.id===id);const b=new Blob([generate(id,cfg)],{type:"text/plain"});
  const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`${s.folder}.ino`;a.click();URL.revokeObjectURL(a.href);toast(`${s.folder}.ino 다운로드`);}

// ================= 키보드 =================
addEventListener("keydown",e=>{
  if($("cfgModal").classList.contains("on"))return;
  if(typeof view==="number" && tab==="practice"){
    if(e.key==="ArrowRight")setSub(sub+1); else if(e.key==="ArrowLeft")setSub(sub-1);
  }
});

// ================= 툴바: 글자 크기 · 수업 모드 =================
const ZOOMS=[0.9,1,1.15,1.3,1.5,1.7];
let zi=Number(localStorage.getItem("eduino_zoom")||1);   // index
let present=localStorage.getItem("eduino_present")==="1";
function applyView(){
  document.documentElement.style.setProperty("--zoom",ZOOMS[zi]);
  $("fsLabel").textContent=Math.round(ZOOMS[zi]*100)+"%";
  document.body.classList.toggle("present",present);
  localStorage.setItem("eduino_zoom",zi);
  localStorage.setItem("eduino_present",present?"1":"0");
}
$("fsDown").onclick=()=>{ zi=Math.max(0,zi-1); applyView(); };
$("fsUp").onclick=()=>{ zi=Math.min(ZOOMS.length-1,zi+1); applyView(); };
$("presentBtn").onclick=()=>{
  present=!present;
  if(present && ZOOMS[zi]<1.3) zi=3;      // 수업 모드 진입 시 크게(1.3)
  if(!present && ZOOMS[zi]>1.15) zi=1;    // 해제 시 보통으로
  applyView();
};

// ================= 시작 =================
$("cfgClose").onclick=()=>openCfg(false);
$("cfgBack").onclick=()=>openCfg(false);
renderMod(); renderConfig(); applyView(); render();
