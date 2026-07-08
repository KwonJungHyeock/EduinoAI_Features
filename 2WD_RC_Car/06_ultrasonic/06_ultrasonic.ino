/* =====================================================================
 * Step 6 — 초음파 거리 측정 (폰으로 값 전송)
 * 2WD RC카 코스 — 자동 생성 코드 (배선 설정 반영)
 *
 * [내 배선 설정]
 *   블루투스(HC-06) : 모듈TX -> A0(RX),  모듈RX -> A1(TX, 분압)
 *   초음파 HC-SR04         : Trig=A2, Echo=A3
 *   모터                  : 좌=M1, 우=M2
 * ===================================================================== */
#include <SoftwareSerial.h>
SoftwareSerial BT(A0, A1); // (RX, TX)
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
