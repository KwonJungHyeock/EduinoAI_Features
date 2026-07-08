import { DEFAULT_CONFIG, FREE_PINS, validate, STEPS, generate } from "./codegen.mjs";

// ---------- 상태 ----------
const cfg = { ...DEFAULT_CONFIG };
let current = 1;
const $ = id => document.getElementById(id);

// ---------- 단계별 가이드 (연결/실행 안내) ----------
const GUIDES = {
  1: () => `
    <h4>실행 방법</h4>
    <ul>
      <li>배선 후 이 코드를 Arduino IDE에서 <b>Uno</b>로 업로드 (SoftwareSerial이라 업로드 시 BT선 분리 불필요)</li>
      <li>업로드 후 <b>시리얼 모니터(9600)</b>를 열어두면 받은 글자가 보입니다</li>
    </ul>
    ${btConnectGuide()}
    <h4>성공 기준 ✅</h4>
    <ul><li>폰에 <code>echo: 1</code>, <code>LED ON</code> 회신</li><li>보드 LED가 <code>1</code>/<code>0</code>에 반응</li></ul>`,
  2: () => `
    <h4>AT 커맨드 사용법</h4>
    <ul>
      <li>업로드 후 시리얼 모니터(9600)에서 명령 입력. <b>${cfg.module}</b> 기준.</li>
      ${cfg.module === "HC-06" ? `
        <li>줄바꿈 <b>없음(No line ending)</b> 으로 전송, <b>폰과 연결 안 된 상태</b>에서만 응답</li>
        <li><code>AT</code> → <code>OK</code> / <code>AT+NAMEmyCar</code> 이름변경 / <code>AT+BAUD4</code> = 9600</li>` : `
        <li>HM-10은 연결 여부와 무관하게 응답. 명령 뒤 처리 방식은 펌웨어 버전마다 조금 다름</li>
        <li><code>AT</code> → <code>OK</code> / <code>AT+NAMEmyCar</code> / <code>AT+BAUD0</code> = 9600 / <code>AT+ROLE0</code> 슬레이브</li>`}
      <li>속도(baud)를 바꿨다면, 다음 단계 코드의 <code>BT.begin()</code>도 같은 값으로 맞추세요</li>
    </ul>`,
  3: () => `
    <h4>실행 방법</h4>
    <ul>
      <li>모터 전원(배터리)을 쉴드 EXT_PWR에 연결, <b>공통 GND</b> 확인</li>
      <li>업로드하면 전진→후진→좌→우 데모가 반복됩니다</li>
      <li><b>바퀴가 반대로 돌면</b> 왼쪽 설정의 <b>‘좌/우 반전’</b>을 켜세요 → 코드가 자동 반영됩니다</li>
    </ul>`,
  4: () => `${btConnectGuide()}<h4>조작</h4><ul><li>앱에서 <code>F</code>/<code>B</code>/<code>L</code>/<code>R</code>/<code>S</code> 전송 → 주행</li></ul>`,
  5: () => `<h4>조작</h4><ul><li>주행 <code>F/B/L/R/S</code> + 속도 <code>0</code>~<code>9</code> (0=정지, 9=최고)</li></ul>`,
  6: () => `<h4>실행</h4><ul><li>앱에서 <code>D</code> 전송 → 거리(cm) 회신. 시리얼 모니터엔 1초마다 자동 출력</li></ul>`,
  7: () => `
    <h4>조작 (완성본)</h4>
    <ul>
      <li>주행 <code>F/B/L/R/S</code>, 속도 <code>0~9</code>, 거리 <code>D</code></li>
      <li><code>A</code> = 자동(자율 회피) 모드 / <code>M</code> = 수동 모드</li>
      <li>수동이어도 전진 중 장애물이 <code>${cfg.stopCm}cm</code> 이내면 <b>자동 정지</b></li>
    </ul>`,
};

function btConnectGuide() {
  if (cfg.module === "HC-06") {
    return `<h4>폰 연결 — HC-06 (안드로이드)</h4><ul>
      <li>설정 &gt; 블루투스에서 <code>HC-06</code> 페어링 (PIN <code>1234</code>/<code>0000</code>)</li>
      <li>앱 <b>Serial Bluetooth Terminal</b> → Devices에서 HC-06 연결 → 글자 전송</li>
      <li>⚠️ HC-06은 아이폰 연결 불가 (Classic SPP)</li></ul>`;
  }
  return `<h4>폰 연결 — HM-10 (아이폰·안드로이드 BLE)</h4><ul>
      <li>페어링 없이 BLE 앱에서 직접 연결. 아이폰: <b>LightBlue</b>/<b>nRF Connect</b></li>
      <li>서비스 <code>FFE0</code> → 특성 <code>FFE1</code> 에 <b>Write</b>로 문자 전송, <b>Notify</b> 켜면 회신 수신</li>
      <li>안드로이드는 <b>Serial Bluetooth Terminal</b>의 BLE 모드로도 가능</li></ul>`;
}

// ---------- 설정 패널 렌더 ----------
function pinSelect(key) {
  return `<select data-cfg="${key}">${FREE_PINS.map(p =>
    `<option value="${p}" ${cfg[key] === p ? "selected" : ""}>${p}</option>`).join("")}</select>`;
}
function portSelect(key) {
  return `<select data-cfg="${key}" data-num="1">${[1,2,3,4].map(n =>
    `<option value="${n}" ${cfg[key] === n ? "selected" : ""}>M${n}</option>`).join("")}</select>`;
}

function renderConfig() {
  $("config").innerHTML = `
    <div class="groupttl">블루투스 핀</div>
    <div class="row"><label>RX (모듈 TX→)</label><div class="ctl">${pinSelect("btRx")}</div></div>
    <div class="row"><label>TX (→모듈 RX)</label><div class="ctl">${pinSelect("btTx")}
      <button class="swap" id="swapBt" title="RX/TX 서로 바꾸기">⇄ 스왑</button></div></div>

    <div class="groupttl">초음파 HC-SR04 핀</div>
    <div class="row"><label>Trig</label><div class="ctl">${pinSelect("trig")}</div></div>
    <div class="row"><label>Echo</label><div class="ctl">${pinSelect("echo")}
      <button class="swap" id="swapSr" title="Trig/Echo 바꾸기">⇄ 스왑</button></div></div>

    <div class="groupttl">모터 (L293D 쉴드)</div>
    <div class="row"><label>좌측 포트</label><div class="ctl">${portSelect("motorLeft")}
      <label class="toggle"><input type="checkbox" data-cfg="leftReversed" ${cfg.leftReversed?"checked":""}/>반전</label></div></div>
    <div class="row"><label>우측 포트</label><div class="ctl">${portSelect("motorRight")}
      <label class="toggle"><input type="checkbox" data-cfg="rightReversed" ${cfg.rightReversed?"checked":""}/>반전</label></div></div>

    <div class="groupttl">주행 파라미터</div>
    <div class="row"><label>기본 속도</label><div class="ctl">
      <input type="range" min="0" max="255" step="5" data-cfg="baseSpeed" data-num="1" value="${cfg.baseSpeed}"/>
      <span class="val" id="vSpeed">${cfg.baseSpeed}</span></div></div>
    <div class="row"><label>정지 거리</label><div class="ctl">
      <input type="range" min="5" max="80" step="1" data-cfg="stopCm" data-num="1" value="${cfg.stopCm}"/>
      <span class="val" id="vStop">${cfg.stopCm}cm</span></div></div>`;

  // 이벤트 바인딩
  $("config").querySelectorAll("[data-cfg]").forEach(el => {
    const key = el.dataset.cfg;
    const evt = el.type === "range" ? "input" : "change";
    el.addEventListener(evt, () => {
      let v = el.type === "checkbox" ? el.checked : el.value;
      if (el.dataset.num) v = Number(v);
      cfg[key] = v;
      if (key === "baseSpeed") $("vSpeed").textContent = v;
      if (key === "stopCm") $("vStop").textContent = v + "cm";
      refresh();
    });
  });
  $("swapBt").onclick = () => { [cfg.btRx, cfg.btTx] = [cfg.btTx, cfg.btRx]; renderConfig(); refresh(); };
  $("swapSr").onclick = () => { [cfg.trig, cfg.echo] = [cfg.echo, cfg.trig]; renderConfig(); refresh(); };
}

// ---------- 모듈 선택 ----------
function renderModPick() {
  $("modPick").innerHTML = ["HC-06", "HM-10"].map(m =>
    `<button class="${cfg.module===m?"on":""}" data-mod="${m}">${m}</button>`).join("");
  $("modPick").querySelectorAll("button").forEach(b =>
    b.onclick = () => { cfg.module = b.dataset.mod; renderModPick(); refresh(); });
}

// ---------- 단계 네비 ----------
function renderSteps() {
  $("steps").innerHTML = STEPS.map(s =>
    `<button class="stepbtn ${s.id===current?"on":""}" data-step="${s.id}">
      <span class="num">${s.id}</span>
      <span><span class="st">${s.title}</span><br><span class="sg">${s.tag}</span></span>
    </button>`).join("");
  $("steps").querySelectorAll("button").forEach(b =>
    b.onclick = () => { current = Number(b.dataset.step); renderSteps(); refresh(); });
}

// ---------- 코드 하이라이트 ----------
const KW = ["#include","#define","if","else","for","while","switch","case","break","return",
  "void","const","static","unsigned","uint8_t","uint16_t","int","long","bool","char","true","false",
  "default","setup","loop","delay","delayMicroseconds","digitalWrite","digitalRead","pinMode","pulseIn",
  "map","millis","HIGH","LOW","OUTPUT","INPUT","INPUT_PULLUP","FORWARD","BACKWARD","RELEASE","LED_BUILTIN"];
function esc(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function highlight(code){
  const escaped = esc(code);
  const kw = KW.map(k=>k.replace(/[#]/g,"\\#")).join("|");
  const re = new RegExp(
    `(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)` +          // 1 주석
    `|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')` +   // 2 문자열
    `|(#\\w+)` +                                         // 3 전처리기
    `|\\b(${kw})\\b` +                                   // 4 키워드
    `|\\b(\\d[\\dxXa-fA-F]*[uUlL]*)\\b`,                 // 5 숫자
    "g");
  return escaped.replace(re, (m,c,s,p,k,n)=>{
    if(c) return `<span class="tok-cmt">${c}</span>`;
    if(s) return `<span class="tok-str">${s}</span>`;
    if(p) return `<span class="tok-pre">${p}</span>`;
    if(k) return `<span class="tok-kw">${k}</span>`;
    if(n) return `<span class="tok-num">${n}</span>`;
    return m;
  });
}

// ---------- 전체 갱신 ----------
let lastCode = "";
function refresh(){
  const step = STEPS.find(s=>s.id===current);
  const errs = validate(cfg);
  $("errors").innerHTML = errs.map(e=>"⚠️ "+e).join("<br>");

  // 헤더
  $("stepHead").innerHTML = `
    <div class="stephead"><span class="badge">STEP ${step.id}</span><h2>${step.title}</h2></div>
    <div class="goal">${step.goal}</div>
    <div class="wireline">BT ${cfg.module}: 모듈TX→${cfg.btRx}, 모듈RX→${cfg.btTx}(분압) · SR04 Trig=${cfg.trig} Echo=${cfg.echo} · 모터 좌M${cfg.motorLeft}${cfg.leftReversed?"↺":""} 우M${cfg.motorRight}${cfg.rightReversed?"↺":""}</div>`;

  $("guide").innerHTML = GUIDES[step.id] ? GUIDES[step.id]() : "";

  // 코드
  lastCode = generate(step.id, cfg);
  $("code").innerHTML = highlight(lastCode);
  $("codeName").textContent = `${step.folder}/${step.folder}.ino`;
}

// ---------- 복사/다운로드 ----------
function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("on"); setTimeout(()=>t.classList.remove("on"),1400); }
$("copyBtn").onclick = async ()=>{
  try{ await navigator.clipboard.writeText(lastCode); toast("복사됨!"); }
  catch{ toast("복사 실패 — 코드 영역에서 직접 선택하세요"); }
};
$("dlBtn").onclick = ()=>{
  const step = STEPS.find(s=>s.id===current);
  const blob = new Blob([lastCode], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${step.folder}.ino`;
  a.click(); URL.revokeObjectURL(a.href);
  toast(`${step.folder}.ino 다운로드`);
};

// ---------- 시작 ----------
renderModPick(); renderConfig(); renderSteps(); refresh();
