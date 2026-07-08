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

// ================= 콘텐츠 =================
const CONCEPT = {
  1:`<p>블루투스에는 두 종류가 있어요. <b>Classic(SPP)</b> 방식의 <code>HC-06</code> 은 시리얼 통신을 그대로
     무선으로 옮긴 것이고, <b>BLE</b> 방식의 <code>HM-10</code> 은 저전력이라 아이폰에서도 연결됩니다.</p>
     <p>아두이노의 하드웨어 시리얼(D0/D1)은 USB 업로드와 겹치므로, 다른 핀에서도 시리얼처럼 통신하게 해주는
     <code>SoftwareSerial</code> 을 사용합니다. 그래서 업로드할 때 선을 빼지 않아도 돼요.</p>
     <p>첫 단계는 <b>에코 테스트</b> — 폰에서 보낸 글자를 보드가 그대로 되돌려주는지 확인합니다.
     "데이터가 오간다"를 눈으로 보는 게 모든 무선 프로젝트의 출발점입니다.</p>`,
  2:`<p><b>AT 커맨드</b>는 블루투스 모듈에게 내리는 '설정 명령어'입니다. 모듈의 <b>이름</b>, 통신 <b>속도(baud)</b>,
     역할(마스터/슬레이브) 등을 바꿀 수 있어요.</p>
     <p>이 단계의 코드는 시리얼 모니터 입력을 모듈로 그대로 넘겨주는 <b>브리지</b>입니다.
     예: <code>AT+NAMEmyCar</code> 로 이름을 바꾸면 폰 블루투스 목록에 <code>myCar</code> 로 보입니다.</p>`,
  3:`<p>DC모터는 전류 방향에 따라 정/역회전합니다. 이 방향을 바꾸는 회로가 <b>H-브리지</b>이고 <code>L293D</code> 칩이
     그 역할을 해요. 쉴드는 <code>74HC595</code> 로 모터 4개의 방향을 제어합니다.</p>
     <p><code>AFMotor</code> 의 <code>run(FORWARD/BACKWARD/RELEASE)</code> 로 방향을, <code>setSpeed(0~255)</code> 로
     <b>PWM</b> 속도를 조절합니다. 아직 블루투스 없이 동작만 확인해요.</p>`,
  4:`<p>이제 통신과 모터를 합칩니다. 폰이 보낸 <b>문자 하나</b>를 <b>하나의 동작</b>으로 해석하는 <b>명령 프로토콜</b>을
     설계해요: <code>F</code>=전진, <code>B</code>=후진, <code>L</code>/<code>R</code>=좌/우, <code>S</code>=정지.</p>
     <p>수신 루프에서 <code>switch</code> 로 문자를 분기해 주행 함수를 호출합니다. 드디어 조종이 됩니다!</p>`,
  5:`<p>속도는 <b>PWM(펄스폭 변조)</b> 으로 조절합니다. 전압을 아주 빠르게 껐다 켰다 하며 '켜져 있는 비율'을 바꾸면
     평균 전력이 달라져 속도가 조절돼요.</p>
     <p>폰에서 <code>0</code>~<code>9</code> 를 보내면 <code>map()</code> 으로 0~255 범위로 변환해 적용합니다.</p>`,
  6:`<p><code>HC-SR04</code> 초음파 센서는 박쥐처럼 소리로 거리를 잽니다. <code>Trig</code> 에 10µs 펄스를 주면 초음파를 쏘고,
     반사돼 돌아오면 <code>Echo</code> 가 그 시간만큼 HIGH가 돼요.</p>
     <p>거리 = (왕복 시간 × 음속) ÷ 2. 코드에서는 <code>pulseIn()</code> 으로 시간을 재고 <code>/58</code> 로 cm를 근사합니다.</p>`,
  7:`<p>마지막! 지금까지 배운 걸 하나의 <b>상태 기계</b>로 통합합니다. 수동/자동 모드를 두고, 매 순간 센서를 읽어
     <b>안전 판단</b>을 해요.</p>
     <ul><li><b>안전 정지</b>: 전진 중 장애물이 가까우면 명령과 무관하게 멈춤</li>
     <li><b>자율 회피</b>(<code>A</code>): 스스로 전진하다 막히면 후진·방향전환</li></ul>
     <p>자율주행의 가장 기초적인 형태입니다. 완성이에요! 🎉</p>`,
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
      {id:"ref-hw", idx:"01", ic:"🔧", label:"하드웨어 구성"},
      {id:"ref-wire", idx:"02", ic:"🔌", label:"배선 · 전원"}]},
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

    <div class="card"><div class="card-h"><span class="bar"></span>💡 이론 학습</div>${CONCEPT[step.id]||""}</div>

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
