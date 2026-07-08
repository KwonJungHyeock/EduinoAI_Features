/* =====================================================================
 * Step 5 — 속도 제어 (PWM, 0~9 단계)
 * 2WD RC카 코스 — 자동 생성 코드 (배선 설정 반영)
 *
 * [내 배선 설정]
 *   블루투스(HC-06) : 모듈TX -> A0(RX),  모듈RX -> A1(TX, 분압)
 *   초음파 HC-SR04         : Trig=A2, Echo=A3
 *   모터                  : 좌=M1, 우=M2
 * ===================================================================== */
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

void setup(){
  Serial.begin(9600);
  BT.begin(9600);
  setSpeedBoth(180);
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
