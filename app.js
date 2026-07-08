import { DEFAULT_CONFIG, FREE_PINS, validate, STEPS, generate } from "./codegen.mjs";

const $ = id => document.getElementById(id);
const cfg = { ...DEFAULT_CONFIG };

// ================= 진도 저장 =================
const PKEY = "eduino_rc_progress";
let done = new Set(JSON.parse(localStorage.getItem(PKEY) || "[]"));
const saveDone = () => localStorage.setItem(PKEY, JSON.stringify([...done]));

// ================= 챕터별 개념(교육 콘텐츠) =================
const CONCEPT = {
  1:`<p>블루투스에는 두 종류가 있어요. <b>Classic(SPP)</b> 방식의 <code>HC-06</code> 은 시리얼 통신을 그대로
     무선으로 옮긴 것이고, <b>BLE</b> 방식의 <code>HM-10</code> 은 저전력이라 아이폰에서도 연결됩니다.</p>
     <p>아두이노의 하드웨어 시리얼(D0/D1)은 USB 업로드와 겹치기 때문에, 다른 핀에서도 시리얼처럼
     통신하게 해주는 <code>SoftwareSerial</code> 을 사용합니다. 그래서 업로드할 때 선을 빼지 않아도 돼요.</p>
     <p>첫 단계는 <b>에코 테스트</b> — 폰에서 보낸 글자를 보드가 그대로 되돌려주는지 확인합니다.
     "데이터가 오간다"를 눈으로 확인하는 게 모든 무선 프로젝트의 출발점입니다.</p>`,
  2:`<p><b>AT 커맨드</b>는 블루투스 모듈에게 내리는 '설정 명령어'예요. 모듈의 <b>이름</b>, 통신 <b>속도(baud)</b>,
     역할(마스터/슬레이브) 등을 바꿀 수 있습니다.</p>
     <p>이 단계의 코드는 시리얼 모니터에 입력한 명령을 모듈로 그대로 넘겨주는 <b>브리지</b>예요.
     예를 들어 <code>AT+NAMEmyCar</code> 로 이름을 바꾸면, 폰의 블루투스 목록에 <code>myCar</code> 로 보입니다.</p>`,
  3:`<p>DC모터는 전류 방향에 따라 정/역회전합니다. 이 방향을 바꿔주는 회로가 <b>H-브리지</b>이고,
     <code>L293D</code> 칩이 그 역할을 해요. 쉴드는 <code>74HC595</code> 시프트레지스터로 모터 4개의 방향을 제어합니다.</p>
     <p><code>AFMotor</code> 라이브러리의 <code>run(FORWARD/BACKWARD/RELEASE)</code> 로 방향을,
     <code>setSpeed(0~255)</code> 로 <b>PWM</b> 속도를 조절합니다. 아직 블루투스 없이 동작만 확인해요.</p>
     <div class="callout warn">바퀴가 반대로 돌면 설정에서 <b>좌/우 반전</b>을 켜세요 → 코드가 자동으로 방향을 뒤집습니다.</div>`,
  4:`<p>이제 통신과 모터를 합칩니다. 폰이 보낸 <b>문자 하나</b>를 <b>하나의 동작</b>으로 해석하는
     <b>명령 프로토콜</b>을 설계해요: <code>F</code>=전진, <code>B</code>=후진, <code>L</code>/<code>R</code>=좌/우, <code>S</code>=정지.</p>
     <p>수신 루프에서 <code>switch</code> 로 문자를 분기해 해당 주행 함수를 호출합니다. 드디어 조종이 됩니다!</p>`,
  5:`<p>속도는 <b>PWM(펄스폭 변조)</b> 으로 조절합니다. 모터에 전압을 아주 빠르게 껐다 켰다 하면서
     '켜져 있는 비율'을 바꾸면 평균 전력이 달라져 속도가 조절돼요.</p>
     <p>폰에서 <code>0</code>~<code>9</code> 숫자를 보내면 <code>map()</code> 함수로 0~255 범위로 변환해 적용합니다.</p>`,
  6:`<p><code>HC-SR04</code> 초음파 센서는 박쥐처럼 소리로 거리를 잽니다. <code>Trig</code> 에 10µs 펄스를 주면
     초음파를 쏘고, 반사돼 돌아오면 <code>Echo</code> 가 그 시간만큼 HIGH가 돼요.</p>
     <p>거리 = (왕복 시간 × 음속) ÷ 2. 코드에서는 <code>pulseIn()</code> 으로 시간을 재고 <code>/58</code> 로 cm를 근사합니다.
     측정값을 <code>D</code> 명령으로 폰에 되돌려 보내요.</p>`,
  7:`<p>마지막! 지금까지 배운 걸 하나의 <b>상태 기계</b>로 통합합니다. 수동/자동 모드를 두고,
     매 순간 센서를 읽어 <b>안전 판단</b>을 해요.</p>
     <ul>
       <li><b>안전 정지</b>: 전진 중 장애물이 가까우면 명령과 무관하게 멈춤</li>
       <li><b>자율 회피</b>(<code>A</code>): 스스로 전진하다 막히면 후진·방향전환</li>
     </ul>
     <p>이게 자율주행의 가장 기초적인 형태입니다. 축하해요 — 완성입니다! 🎉</p>`,
};

function guideHTML(step){
  const bt = cfg.module === "HC-06"
    ? `<h4><span class="ic">📱</span>폰 연결 — HC-06 (안드로이드)</h4>
       <ul><li>설정 &gt; 블루투스에서 <code>HC-06</code> 페어링 (PIN <code>1234</code>/<code>0000</code>)</li>
       <li>앱 <b>Serial Bluetooth Terminal</b> → Devices에서 연결 → 글자 전송</li>
       <li>⚠️ HC-06은 아이폰 연결 불가 (Classic SPP)</li></ul>`
    : `<h4><span class="ic">📱</span>폰 연결 — HM-10 (아이폰·안드로이드 BLE)</h4>
       <ul><li>페어링 없이 BLE 앱에서 직접 연결. 아이폰: <b>LightBlue</b>/<b>nRF Connect</b></li>
       <li>서비스 <code>FFE0</code> → 특성 <code>FFE1</code> 에 <b>Write</b>로 문자 전송, <b>Notify</b>로 회신 수신</li></ul>`;

  const run = {
    1:`<ul><li>업로드 후 <b>시리얼 모니터(9600)</b>를 열어두세요</li>
        <li>폰에서 <code>1</code>/<code>0</code> → LED on/off, 아무 글자 → <code>echo:</code> 회신</li></ul>${bt}`,
    2:`<ul><li>시리얼 모니터(9600)에서 AT 명령 입력 — <b>${cfg.module}</b> 기준</li>
        ${cfg.module==="HC-06"
          ? `<li>줄바꿈 <b>없이</b>, <b>폰과 연결 안 된 상태</b>에서: <code>AT</code>→<code>OK</code>, <code>AT+NAMEmyCar</code>, <code>AT+BAUD4</code>(9600)</li>`
          : `<li><code>AT</code>→<code>OK</code>, <code>AT+NAMEmyCar</code>, <code>AT+BAUD0</code>(9600), <code>AT+ROLE0</code>(슬레이브)</li>`}
        <li>속도를 바꿨다면 이후 코드의 <code>BT.begin()</code> 도 같은 값으로</li></ul>`,
    3:`<ul><li>모터 배터리를 쉴드 EXT_PWR에 연결, <b>공통 GND</b> 확인 (USB로 모터 구동 금지)</li>
        <li>업로드하면 전진→후진→좌→우 데모 반복. 방향이 반대면 설정에서 <b>반전</b></li></ul>`,
    4:`${bt}<h4><span class="ic">🎮</span>조작</h4><ul><li><code>F</code>/<code>B</code>/<code>L</code>/<code>R</code>/<code>S</code> 전송 → 주행</li></ul>`,
    5:`<h4><span class="ic">🎮</span>조작</h4><ul><li>주행 <code>F/B/L/R/S</code> + 속도 <code>0</code>~<code>9</code></li></ul>`,
    6:`<h4><span class="ic">📏</span>실행</h4><ul><li><code>D</code> 전송 → 거리(cm) 회신, 시리얼 모니터엔 1초마다 자동 출력</li></ul>`,
    7:`<h4><span class="ic">🎮</span>조작 (완성본)</h4>
        <ul><li>주행 <code>F/B/L/R/S</code>, 속도 <code>0~9</code>, 거리 <code>D</code></li>
        <li><code>A</code>=자동(자율 회피) / <code>M</code>=수동. 수동이어도 전진 중 <code>${cfg.stopCm}cm</code> 이내면 자동 정지</li></ul>`,
  };
  return run[step.id] || "";
}

// ================= 코드 하이라이트 =================
const KW=["#include","#define","if","else","for","while","switch","case","break","return","void","const",
  "static","unsigned","uint8_t","uint16_t","int","long","bool","char","true","false","default","setup","loop",
  "delay","delayMicroseconds","digitalWrite","digitalRead","pinMode","pulseIn","map","millis","HIGH","LOW",
  "OUTPUT","INPUT","INPUT_PULLUP","FORWARD","BACKWARD","RELEASE","LED_BUILTIN"];
const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function highlight(code){
  const kw=KW.map(k=>k.replace(/#/g,"\\#")).join("|");
  const re=new RegExp(
    `(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)`+
    `|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')`+
    `|(#\\w+)`+`|\\b(${kw})\\b`+`|\\b(\\d[\\dxXa-fA-F]*[uUlL]*)\\b`,"g");
  return esc(code).replace(re,(m,c,s,p,k,n)=>{
    if(c)return`<span class="tok-cmt">${c}</span>`;
    if(s)return`<span class="tok-str">${s}</span>`;
    if(p)return`<span class="tok-pre">${p}</span>`;
    if(k)return`<span class="tok-kw">${k}</span>`;
    if(n)return`<span class="tok-num">${n}</span>`;
    return m;});
}

// ================= 챕터 구성 =================
// index 0 = 소개, 1..7 = 단계, 8 = 마무리
const TOTAL = STEPS.length + 2;
let cur = 0;

function wireSummary(){
  return `BT ${cfg.module}: 모듈TX→${cfg.btRx}, 모듈RX→${cfg.btTx}(분압) · `+
         `SR04 Trig=${cfg.trig} Echo=${cfg.echo} · 모터 좌M${cfg.motorLeft}${cfg.leftReversed?"↺":""} 우M${cfg.motorRight}${cfg.rightReversed?"↺":""}`;
}

function introSlide(){
  return `<div class="slide-inner"><div class="hero">
    <div class="big">🤖🚗</div>
    <h1>2WD RC카 만들기</h1>
    <p>블루투스로 조종하는 나만의 RC카를 만들며 <b>무선 통신 · 모터 제어 · 센서</b>를
       한 단계씩 배우는 피지컬 코딩 코스입니다.</p>
    <div class="hwchips">
      <div class="hwchip">🧠 <b>Arduino Uno</b></div>
      <div class="hwchip">⚙️ <b>L293D</b> 모터쉴드</div>
      <div class="hwchip">📶 <b>HC-06/HM-10</b></div>
      <div class="hwchip">📏 <b>HC-SR04</b></div>
    </div>
    <div class="curlist">
      ${STEPS.map(s=>`<div class="curitem" data-go="${s.id}">
        <div class="n">${s.id}</div><div><div class="t">${s.title}</div><div class="g">${s.tag}</div></div></div>`).join("")}
    </div>
    <button class="cta" data-go="1">🚀 학습 시작하기</button>
    <p style="font-size:12px;margin-top:14px">진도는 자동 저장돼요. ← → 키, 스와이프, 위 칩으로도 이동합니다.</p>
  </div></div>`;
}

function stepSlide(step){
  return `<div class="slide-inner">
    <div class="chhead">
      <span class="chtag">STEP ${step.id} · ${step.tag}</span>
      <h2>${step.title}</h2>
      <div class="obj">🎯 ${step.goal}</div>
    </div>

    <div class="block"><h4><span class="ic">💡</span>개념 이해</h4>${CONCEPT[step.id]||""}</div>

    <div class="block"><h4><span class="ic">🔌</span>배선</h4>
      <p>지금 설정된 배선 기준입니다. 다르면 우측 상단 <b>⚙️ 배선 설정</b>에서 바꾸세요.</p>
      <div class="wireline" id="wire-${step.id}">${wireSummary()}</div></div>

    <div class="block"><h4><span class="ic">🧑‍💻</span>코드</h4>
      <div class="codewrap">
        <div class="codebar">
          <span class="codename">${step.folder}/${step.folder}.ino</span>
          <div class="codebtns">
            <button class="mini" data-copy="${step.id}">📋 복사</button>
            <button class="mini" data-dl="${step.id}">⬇️ .ino</button>
          </div>
        </div>
        <pre class="code"><code id="code-${step.id}"></code></pre>
      </div></div>

    <div class="block"><h4><span class="ic">🧪</span>직접 해보기 &amp; 체크포인트</h4>
      <div id="guide-${step.id}">${guideHTML(step)}</div></div>
  </div>`;
}

function outroSlide(){
  return `<div class="slide-inner"><div class="hero">
    <div class="big">🏁</div>
    <h1>코스 완주!</h1>
    <p>블루투스 통신 → 모터 제어 → 센서 → 자율 안전주행까지 완성했습니다.
       이제 RC카는 여러분이 설계한 대로 움직입니다.</p>
    <div class="block" style="text-align:left;margin-top:18px">
      <h4><span class="ic">🚀</span>더 나아가기</h4>
      <ul>
        <li>커스텀 조종 앱(버튼 UI) 만들기 · 웹 블루투스 연동</li>
        <li>라인트레이싱(적외선 센서) · 후방 센서 · 부저/LED 상태표시</li>
        <li>속도·거리 텔레메트리 기록 및 그래프</li>
      </ul>
    </div>
    <button class="cta" data-go="0">↩ 처음으로</button>
  </div></div>`;
}

// ================= 렌더 =================
function buildTrack(){
  const slides = [introSlide(), ...STEPS.map(stepSlide), outroSlide()];
  $("track").innerHTML = slides.map(s=>`<div class="slide">${s}</div>`).join("");
  // 델리게이트 이벤트 (이동/복사/다운로드)
  $("track").querySelectorAll("[data-go]").forEach(el=>el.onclick=()=>go(Number(el.dataset.go)));
  $("track").querySelectorAll("[data-copy]").forEach(el=>el.onclick=()=>copyCode(Number(el.dataset.copy)));
  $("track").querySelectorAll("[data-dl]").forEach(el=>el.onclick=()=>dlCode(Number(el.dataset.dl)));
}

function buildChips(){
  const items = [{i:0,label:"소개"}, ...STEPS.map(s=>({i:s.id,label:String(s.id)})), {i:TOTAL-1,label:"완료"}];
  $("chips").innerHTML = items.map(it=>{
    const isStep = it.i>=1 && it.i<=STEPS.length;
    const isDone = isStep && done.has(it.i);
    const mark = it.i===0 ? "📖" : it.i===TOTAL-1 ? "🏁" : (isDone?"✓":it.label);
    return `<div class="chip ${it.i===cur?"on":""} ${isDone?"done":""}" data-chip="${it.i}">
      <span class="dot">${mark}</span>${it.label}</div>`;
  }).join("");
  $("chips").querySelectorAll("[data-chip]").forEach(el=>el.onclick=()=>go(Number(el.dataset.chip)));
}

function updateDynamic(){
  // 각 단계 코드/배선/가이드 갱신 (설정·모듈 변경 반영)
  for(const s of STEPS){
    const codeEl=$("code-"+s.id); if(codeEl) codeEl.innerHTML=highlight(generate(s.id,cfg));
    const wEl=$("wire-"+s.id); if(wEl) wEl.textContent=wireSummary();
    const gEl=$("guide-"+s.id); if(gEl) gEl.innerHTML=guideHTML(s);
  }
  // 진도
  const p = done.size/STEPS.length*100;
  $("pfill").style.width=p+"%";
  buildChips();
  // 에러
  $("errors").innerHTML = validate(cfg).map(e=>"⚠️ "+e).join("<br>");
}

function updateNav(){
  $("prev").disabled = cur===0;
  const nextBtn=$("next");
  const isStep = cur>=1 && cur<=STEPS.length;
  let title = cur===0?"코스 소개":cur===TOTAL-1?"완료":STEPS[cur-1].title;
  $("navmid").innerHTML = `<b>${title}</b>${cur}/${TOTAL-1}`;
  if(cur===TOTAL-1){ nextBtn.textContent="🔄 처음으로"; nextBtn.className="navbtn"; }
  else if(isStep){
    const d=done.has(cur);
    nextBtn.textContent = d ? "다음 →" : "✓ 완료하고 다음";
    nextBtn.className = "navbtn "+(d?"primary":"done");
  } else { nextBtn.textContent="다음 →"; nextBtn.className="navbtn primary"; }
}

function go(i){
  cur = Math.max(0, Math.min(TOTAL-1, i));
  $("track").style.transform = `translateX(-${cur*100}%)`;
  buildChips(); updateNav();
  // 현재 슬라이드 상단으로
  const sl=$("track").children[cur]; if(sl) sl.scrollTop=0;
}
function next(){
  if(cur>=1 && cur<=STEPS.length && !done.has(cur)){ // 완료 처리
    done.add(cur); saveDone(); updateDynamic();
    toast("챕터 완료! 🎉");
  }
  if(cur===TOTAL-1){ go(0); return; }
  go(cur+1);
}
function prev(){ go(cur-1); }

// ================= 설정 패널 =================
function pinSelect(key){return`<select data-cfg="${key}">${FREE_PINS.map(p=>
  `<option value="${p}" ${cfg[key]===p?"selected":""}>${p}</option>`).join("")}</select>`;}
function portSelect(key){return`<select data-cfg="${key}" data-num="1">${[1,2,3,4].map(n=>
  `<option value="${n}" ${cfg[key]===n?"selected":""}>M${n}</option>`).join("")}</select>`;}

function renderConfig(){
  $("config").innerHTML=`
    <div class="groupttl">블루투스 핀</div>
    <div class="row"><label>RX (모듈 TX→)</label><div class="ctl">${pinSelect("btRx")}</div></div>
    <div class="row"><label>TX (→모듈 RX)</label><div class="ctl">${pinSelect("btTx")}
      <button class="swap" id="swapBt">⇄</button></div></div>
    <div class="groupttl">초음파 HC-SR04 핀</div>
    <div class="row"><label>Trig</label><div class="ctl">${pinSelect("trig")}</div></div>
    <div class="row"><label>Echo</label><div class="ctl">${pinSelect("echo")}
      <button class="swap" id="swapSr">⇄</button></div></div>
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
  $("config").querySelectorAll("[data-cfg]").forEach(el=>{
    const key=el.dataset.cfg, evt=el.type==="range"?"input":"change";
    el.addEventListener(evt,()=>{
      let v=el.type==="checkbox"?el.checked:el.value;
      if(el.dataset.num)v=Number(v);
      cfg[key]=v;
      if(key==="baseSpeed")$("vSpeed").textContent=v;
      if(key==="stopCm")$("vStop").textContent=v+"cm";
      updateDynamic();
    });
  });
  $("swapBt").onclick=()=>{[cfg.btRx,cfg.btTx]=[cfg.btTx,cfg.btRx];renderConfig();updateDynamic();};
  $("swapSr").onclick=()=>{[cfg.trig,cfg.echo]=[cfg.echo,cfg.trig];renderConfig();updateDynamic();};
}

function renderMod(){
  $("modPick").innerHTML=["HC-06","HM-10"].map(m=>
    `<button class="${cfg.module===m?"on":""}" data-mod="${m}">${m}</button>`).join("");
  $("modPick").querySelectorAll("button").forEach(b=>
    b.onclick=()=>{cfg.module=b.dataset.mod;renderMod();updateDynamic();});
}

// ================= 복사/다운로드 =================
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),1400);}
async function copyCode(id){
  try{await navigator.clipboard.writeText(generate(id,cfg));toast("복사됨!");}
  catch{toast("복사 실패 — 코드에서 직접 선택하세요");}
}
function dlCode(id){
  const s=STEPS.find(x=>x.id===id);
  const blob=new Blob([generate(id,cfg)],{type:"text/plain"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download=`${s.folder}.ino`;a.click();URL.revokeObjectURL(a.href);
  toast(`${s.folder}.ino 다운로드`);
}

// ================= 입력(키/스와이프) =================
addEventListener("keydown",e=>{
  if($("cfgpanel").classList.contains("on"))return;
  if(e.key==="ArrowRight")go(cur+1);
  else if(e.key==="ArrowLeft")go(cur-1);
});
let sx=0,sy=0,swiping=false;
const vp=$("viewport");
vp.addEventListener("touchstart",e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;swiping=true;},{passive:true});
vp.addEventListener("touchend",e=>{
  if(!swiping)return; swiping=false;
  const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
  if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.4) go(cur + (dx<0?1:-1));
},{passive:true});

// ================= 설정 패널 토글 =================
function openCfg(o){$("cfgpanel").classList.toggle("on",o);$("backdrop").classList.toggle("on",o);}
$("cfgToggle").onclick=()=>openCfg(true);
$("cfgClose").onclick=()=>openCfg(false);
$("backdrop").onclick=()=>openCfg(false);
$("next").onclick=next;
$("prev").onclick=prev;

// ================= 시작 =================
renderMod(); renderConfig(); buildTrack(); updateDynamic(); go(0); updateNav();
