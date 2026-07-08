/* =====================================================================
 * Step 7 — 통합: 안전 주행 (장애물 자동정지 + 자율 회피)
 * 2WD RC카 코스 — 자동 생성 코드 (배선 설정 반영)
 *
 * [내 배선 설정]
 *   블루투스(HC-06) : 모듈TX -> A0(RX),  모듈RX -> A1(TX, 분압)
 *   초음파 HC-SR04         : Trig=A2, Echo=A3
 *   모터                  : 좌=M1, 우=M2
 * ===================================================================== */
// 명령: F/B/L/R/S 주행, 0~9 속도, D 거리요청, A=자동모드, M=수동모드
// 전진 중 장애물이 20cm 이내면 자동 정지. 자동모드는 스스로 회피 주행.
#include <SoftwareSerial.h>
SoftwareSerial BT(A0, A1); // (RX, TX)
#include <AFMotor.h>

AF_DCMotor motorL(1);   // 좌측 모터 (쉴드 M1)
AF_DCMotor motorR(2);   // 우측 모터 (쉴드 M2)

// 결선 방향에 맞춘 정/역방향 상수 (바퀴가 반대로 돌면 설정에서 '반전' 체크)
const uint8_t L_FWD = FORWARD;
const uint8_t L_BWD = BACKWARD;
const uint8_t R_FWD = FORWARD;
const uint8_t R_BWD = BACKWARD;

uint8_t curSpeed = 180;

void setSpeedBoth(uint8_t s){ curSpeed = s; motorL.setSpeed(s); motorR.setSpeed(s); }
void mForward(){ motorL.run(L_FWD); motorR.run(R_FWD); }
void mBack()   { motorL.run(L_BWD); motorR.run(R_BWD); }
void mLeft()   { motorL.run(L_BWD); motorR.run(R_FWD); }  // 제자리 좌회전
void mRight()  { motorL.run(L_FWD); motorR.run(R_BWD); }  // 제자리 우회전
void mStop()   { motorL.run(RELEASE); motorR.run(RELEASE); }
const uint8_t TRIG = A2;
const uint8_t ECHO = A3;

// 거리(cm) 측정. 측정 실패 시 -1
long readDistanceCm(){
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long us = pulseIn(ECHO, HIGH, 30000UL); // 타임아웃 30ms(~5m)
  if (us == 0) return -1;
  return us / 58; // 음속 환산
}

const int STOP_CM = 20;
bool autoMode = false;
char lastCmd = 'S';

void setup(){
  Serial.begin(9600);
  BT.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  setSpeedBoth(180);
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
