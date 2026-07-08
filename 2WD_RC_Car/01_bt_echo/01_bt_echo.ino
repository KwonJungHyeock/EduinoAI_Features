/* =====================================================================
 * Step 1 — 블루투스 통신 첫걸음 (에코 테스트)
 * 2WD RC카 코스 — 자동 생성 코드 (배선 설정 반영)
 *
 * [내 배선 설정]
 *   블루투스(HC-06) : 모듈TX -> A0(RX),  모듈RX -> A1(TX, 분압)
 *   초음파 HC-SR04         : Trig=A2, Echo=A3
 *   모터                  : 좌=M1, 우=M2
 * ===================================================================== */
#include <SoftwareSerial.h>
SoftwareSerial BT(A0, A1); // (RX, TX)

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
