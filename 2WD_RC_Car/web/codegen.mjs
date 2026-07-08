/* =====================================================================
 * codegen.js — 2WD RC카 코스: 아두이노 스케치 생성 엔진 (단일 소스)
 * 브라우저(app.js)와 Node(gen-sketches.mjs) 양쪽에서 import.
 * 사용자의 배선 설정(cfg)에 맞춰 각 단계의 .ino 코드를 문자열로 생성한다.
 * ===================================================================== */

// 연결 가능한 자유 핀 (L293D 쉴드가 안 쓰는 핀)
export const FREE_PINS = ["A0", "A1", "A2", "A3", "A4", "A5", "D2", "D13"];

// 기본 설정 (README/배선도의 권장 배선과 동일)
export const DEFAULT_CONFIG = {
  module: "HC-06",     // "HC-06" | "HM-10"  (코드는 동일, 연결 가이드만 다름)
  btRx: "A0",          // 아두이노 RX  <- 모듈 TX
  btTx: "A1",          // 아두이노 TX  -> 모듈 RX (분압)
  trig: "A2",          // HC-SR04 Trig
  echo: "A3",          // HC-SR04 Echo
  motorLeft: 1,        // 좌측 모터 쉴드 포트 (M1~M4)
  motorRight: 2,       // 우측 모터 쉴드 포트
  leftReversed: false, // 좌 바퀴가 반대로 돌면 true
  rightReversed: false,// 우 바퀴가 반대로 돌면 true
  baseSpeed: 180,      // 0~255
  stopCm: 20,          // 장애물 자동정지 거리(cm)
};

// 설정 검증: 핀 중복 등
export function validate(cfg) {
  const errs = [];
  const pins = [
    ["블루투스 RX", cfg.btRx], ["블루투스 TX", cfg.btTx],
    ["초음파 Trig", cfg.trig], ["초음파 Echo", cfg.echo],
  ];
  const seen = {};
  for (const [name, p] of pins) {
    if (seen[p]) errs.push(`핀 ${p} 중복: "${seen[p]}"와 "${name}"`);
    seen[p] = name;
  }
  if (cfg.motorLeft === cfg.motorRight) errs.push("좌/우 모터 포트가 같습니다.");
  return errs;
}

// --- 방향 상수 계산 ---
const fwd = (rev) => (rev ? "BACKWARD" : "FORWARD");
const bwd = (rev) => (rev ? "FORWARD" : "BACKWARD");

// 공통 헤더 주석
function header(cfg, title) {
  return `/* =====================================================================
 * ${title}
 * 2WD RC카 코스 — 자동 생성 코드 (배선 설정 반영)
 *
 * [내 배선 설정]
 *   블루투스(${cfg.module}) : 모듈TX -> ${cfg.btRx}(RX),  모듈RX -> ${cfg.btTx}(TX, 분압)
 *   초음파 HC-SR04         : Trig=${cfg.trig}, Echo=${cfg.echo}
 *   모터                  : 좌=M${cfg.motorLeft}${cfg.leftReversed ? "(반전)" : ""}, 우=M${cfg.motorRight}${cfg.rightReversed ? "(반전)" : ""}
 * ===================================================================== */`;
}

// 블루투스 헬퍼
function btBlock(cfg) {
  return `#include <SoftwareSerial.h>
SoftwareSerial BT(${cfg.btRx}, ${cfg.btTx}); // (RX, TX)`;
}

// 모터 헬퍼
function motorBlock(cfg) {
  return `#include <AFMotor.h>

AF_DCMotor motorL(${cfg.motorLeft});   // 좌측 모터 (쉴드 M${cfg.motorLeft})
AF_DCMotor motorR(${cfg.motorRight});   // 우측 모터 (쉴드 M${cfg.motorRight})

// 결선 방향에 맞춘 정/역방향 상수 (바퀴가 반대로 돌면 설정에서 '반전' 체크)
const uint8_t L_FWD = ${fwd(cfg.leftReversed)};
const uint8_t L_BWD = ${bwd(cfg.leftReversed)};
const uint8_t R_FWD = ${fwd(cfg.rightReversed)};
const uint8_t R_BWD = ${bwd(cfg.rightReversed)};

uint8_t curSpeed = ${cfg.baseSpeed};

void setSpeedBoth(uint8_t s){ curSpeed = s; motorL.setSpeed(s); motorR.setSpeed(s); }
void mForward(){ motorL.run(L_FWD); motorR.run(R_FWD); }
void mBack()   { motorL.run(L_BWD); motorR.run(R_BWD); }
void mLeft()   { motorL.run(L_BWD); motorR.run(R_FWD); }  // 제자리 좌회전
void mRight()  { motorL.run(L_FWD); motorR.run(R_BWD); }  // 제자리 우회전
void mStop()   { motorL.run(RELEASE); motorR.run(RELEASE); }`;
}

// 초음파 헬퍼
function sonarBlock(cfg) {
  return `const uint8_t TRIG = ${cfg.trig};
const uint8_t ECHO = ${cfg.echo};

// 거리(cm) 측정. 측정 실패 시 -1
long readDistanceCm(){
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long us = pulseIn(ECHO, HIGH, 30000UL); // 타임아웃 30ms(~5m)
  if (us == 0) return -1;
  return us / 58; // 음속 환산
}`;
}

// ===================== 단계별 코드 생성기 =====================

function step1(cfg) {
  return `${header(cfg, "Step 1 — 블루투스 통신 첫걸음 (에코 테스트)")}
${btBlock(cfg)}

void setup(){
  Serial.begin(9600);
  BT.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println(F("[준비완료] 폰에서 글자를 보내보세요."));
  BT.println(F("EDDIE RC 준비완료! 1=LED ON, 0=LED OFF"));
}

void loop(){
  if (BT.available()){
    char c = BT.read();
    Serial.print(F("받음: ")); Serial.println(c);
    BT.print(F("echo: ")); BT.println(c);
    if (c=='1'){ digitalWrite(LED_BUILTIN, HIGH); BT.println(F("LED ON")); }
    else if (c=='0'){ digitalWrite(LED_BUILTIN, LOW); BT.println(F("LED OFF")); }
  }
  if (Serial.available()) BT.write(Serial.read());
}
`;
}

function step2(cfg) {
  return `${header(cfg, "Step 2 — AT 커맨드 브리지 (모듈 이름/속도 설정)")}
// 시리얼 모니터에 입력한 AT 명령을 블루투스 모듈로 그대로 전달한다.
// * HC-06: 모듈이 폰과 '연결되지 않은' 상태에서만 AT 응답. 줄바꿈(개행) 없이 전송.
// * HM-10: AT 응답은 되지만 명령셋이 일부 다름(아래 README 참고).
${btBlock(cfg)}

void setup(){
  Serial.begin(9600);
  BT.begin(9600);
  Serial.println(F("AT 브리지 준비. 시리얼 모니터에서 AT 명령을 입력하세요."));
  Serial.println(F("예) AT / AT+NAME... / AT+BAUD..."));
}

void loop(){
  if (BT.available())     Serial.write(BT.read()); // 모듈 응답 -> 모니터
  if (Serial.available()) BT.write(Serial.read()); // 모니터 입력 -> 모듈
}
`;
}

function step3(cfg) {
  return `${header(cfg, "Step 3 — 모터 기초 (블루투스 없이 동작 확인)")}
${motorBlock(cfg)}

void setup(){
  Serial.begin(9600);
  setSpeedBoth(${cfg.baseSpeed});
  Serial.println(F("모터 데모 시작: 전진-후진-좌-우 반복"));
}

void loop(){
  mForward(); delay(1500);
  mStop();    delay(400);
  mBack();    delay(1500);
  mStop();    delay(400);
  mLeft();    delay(800);
  mStop();    delay(400);
  mRight();   delay(800);
  mStop();    delay(1000);
}
`;
}

function step4(cfg) {
  return `${header(cfg, "Step 4 — 블루투스 주행 (F/B/L/R/S 명령)")}
${btBlock(cfg)}
${motorBlock(cfg)}

void setup(){
  Serial.begin(9600);
  BT.begin(9600);
  setSpeedBoth(${cfg.baseSpeed});
  BT.println(F("주행 준비: F/B/L/R/S"));
}

void loop(){
  if (BT.available()){
    char c = BT.read();
    switch (c){
      case 'F': mForward(); break;
      case 'B': mBack();    break;
      case 'L': mLeft();    break;
      case 'R': mRight();   break;
      case 'S': mStop();    break;
    }
    Serial.print(F("cmd: ")); Serial.println(c);
  }
}
`;
}

function step5(cfg) {
  return `${header(cfg, "Step 5 — 속도 제어 (PWM, 0~9 단계)")}
${btBlock(cfg)}
${motorBlock(cfg)}

void setup(){
  Serial.begin(9600);
  BT.begin(9600);
  setSpeedBoth(${cfg.baseSpeed});
  BT.println(F("주행 F/B/L/R/S + 속도 0~9"));
}

void loop(){
  if (BT.available()){
    char c = BT.read();
    if (c >= '0' && c <= '9'){
      uint8_t s = map(c - '0', 0, 9, 0, 255); // 0~9 -> 0~255
      setSpeedBoth(s);
      BT.print(F("speed: ")); BT.println(s);
    } else {
      switch (c){
        case 'F': mForward(); break;
        case 'B': mBack();    break;
        case 'L': mLeft();    break;
        case 'R': mRight();   break;
        case 'S': mStop();    break;
      }
    }
  }
}
`;
}

function step6(cfg) {
  return `${header(cfg, "Step 6 — 초음파 거리 측정 (폰으로 값 전송)")}
${btBlock(cfg)}
${sonarBlock(cfg)}

void setup(){
  Serial.begin(9600);
  BT.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  BT.println(F("초음파 준비: 'D' 보내면 거리 회신, 1초마다 자동 출력"));
}

unsigned long last = 0;
void loop(){
  // 요청 시 회신
  if (BT.available() && BT.read() == 'D'){
    long d = readDistanceCm();
    BT.print(F("distance: ")); BT.print(d); BT.println(F(" cm"));
  }
  // 1초마다 자동 측정 출력
  if (millis() - last > 1000){
    last = millis();
    long d = readDistanceCm();
    Serial.print(F("거리: ")); Serial.print(d); Serial.println(F(" cm"));
  }
}
`;
}

function step7(cfg) {
  return `${header(cfg, "Step 7 — 통합: 안전 주행 (장애물 자동정지 + 자율 회피)")}
// 명령: F/B/L/R/S 주행, 0~9 속도, D 거리요청, A=자동모드, M=수동모드
// 전진 중 장애물이 ${cfg.stopCm}cm 이내면 자동 정지. 자동모드는 스스로 회피 주행.
${btBlock(cfg)}
${motorBlock(cfg)}
${sonarBlock(cfg)}

const int STOP_CM = ${cfg.stopCm};
bool autoMode = false;
char lastCmd = 'S';

void setup(){
  Serial.begin(9600);
  BT.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  setSpeedBoth(${cfg.baseSpeed});
  BT.println(F("안전주행 준비: F/B/L/R/S, 0-9, D, A(자동)/M(수동)"));
}

void handle(char c){
  switch (c){
    case 'A': autoMode = true;  BT.println(F("AUTO")); break;
    case 'M': autoMode = false; mStop(); BT.println(F("MANUAL")); break;
    case 'D': { long d=readDistanceCm(); BT.print(F("distance: ")); BT.print(d); BT.println(F(" cm")); } break;
    case 'F': case 'B': case 'L': case 'R': case 'S': lastCmd = c; break;
    default:
      if (c>='0'&&c<='9'){ setSpeedBoth(map(c-'0',0,9,0,255)); }
  }
}

unsigned long lastPing = 0; long dist = 999;
void loop(){
  if (BT.available()) handle(BT.read());

  // 거리 갱신(100ms)
  if (millis() - lastPing > 100){
    lastPing = millis();
    long d = readDistanceCm();
    if (d > 0) dist = d;
  }

  if (autoMode){
    // 자율 회피: 앞이 막히면 후진 후 방향 전환
    if (dist < STOP_CM){ mStop(); delay(120); mBack(); delay(300); mRight(); delay(350); }
    else mForward();
  } else {
    // 수동: 전진 명령이어도 장애물 가까우면 자동 정지(안전)
    if (lastCmd=='F' && dist < STOP_CM){ mStop(); }
    else {
      switch (lastCmd){
        case 'F': mForward(); break;
        case 'B': mBack();    break;
        case 'L': mLeft();    break;
        case 'R': mRight();   break;
        default:  mStop();
      }
    }
  }
}
`;
}

// 단계 메타 + 생성기 (앱/노드 공용)
export const STEPS = [
  { id:1, folder:"01_bt_echo",    title:"블루투스 통신 첫걸음", tag:"통신 기초",
    goal:"폰에서 보낸 글자를 받아 되돌려주고 LED를 켠다. 통신이 되는지부터 확인.", gen:step1 },
  { id:2, folder:"02_at_command", title:"AT 커맨드 설정",       tag:"모듈 설정",
    goal:"AT 명령으로 모듈 이름·속도(baud)를 바꾼다. HC-06/HM-10 차이 이해.", gen:step2 },
  { id:3, folder:"03_motor_basic",title:"모터 기초",            tag:"구동",
    goal:"AFMotor로 전/후/좌/우/정지. (블루투스 없이 동작만 확인)", gen:step3 },
  { id:4, folder:"04_bt_drive",   title:"블루투스 주행",        tag:"통합",
    goal:"수신한 F/B/L/R/S 문자를 주행으로 매핑. 드디어 조종!", gen:step4 },
  { id:5, folder:"05_speed_pwm",  title:"속도 제어(PWM)",       tag:"제어",
    goal:"0~9 숫자로 속도 단계 조절(PWM 0~255).", gen:step5 },
  { id:6, folder:"06_ultrasonic", title:"초음파 거리 측정",     tag:"센서",
    goal:"HC-SR04로 거리 측정 후 'D' 명령에 폰으로 값 회신.", gen:step6 },
  { id:7, folder:"07_safe_drive", title:"통합: 안전 주행",      tag:"완성",
    goal:"주행 + 속도 + 장애물 자동정지 + 자율 회피 모드까지 통합.", gen:step7 },
];

export function generate(stepId, cfg) {
  const s = STEPS.find(x => x.id === stepId);
  return s ? s.gen(cfg) : "";
}
