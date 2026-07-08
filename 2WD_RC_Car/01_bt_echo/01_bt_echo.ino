/* =====================================================================
 * Step 1 — 블루투스 통신 첫걸음 (에코 테스트)
 * 목표: 폰에서 보낸 글자를 보드가 받아서 (1) 시리얼 모니터에 출력하고
 *       (2) 폰으로 되돌려주고(에코), '1'/'0'으로 내장 LED를 켠다/끈다.
 *   → 아직 모터는 사용하지 않음. "통신이 되는지"만 확인하는 단계.
 *
 * 배선: 블루투스 TX -> A0(RX),  블루투스 RX -> A1(TX, 분압),  VCC=5V, GND=GND
 * 모듈: HC-06 / HM-10 공통 (기본 9600 baud). 폰 연결법은 README 참고.
 * ===================================================================== */
#include <SoftwareSerial.h>

// SoftwareSerial(RX, TX): A0로 받고 A1로 보냄
SoftwareSerial BT(A0, A1);

void setup() {
  Serial.begin(9600);          // PC 시리얼 모니터 (USB)
  BT.begin(9600);              // 블루투스 모듈 기본 속도
  pinMode(LED_BUILTIN, OUTPUT);

  Serial.println(F("[준비완료] 폰에서 글자를 보내보세요."));
  BT.println(F("EDDIE RC 준비완료! 1=LED ON, 0=LED OFF"));
}

void loop() {
  // (1) 폰 -> 보드
  if (BT.available()) {
    char c = BT.read();

    Serial.print(F("받음: "));
    Serial.println(c);

    // 에코: 받은 글자를 폰으로 되돌려줌
    BT.print(F("echo: "));
    BT.println(c);

    // 간단 제어 예제
    if (c == '1') { digitalWrite(LED_BUILTIN, HIGH); BT.println(F("LED ON")); }
    else if (c == '0') { digitalWrite(LED_BUILTIN, LOW);  BT.println(F("LED OFF")); }
  }

  // (2) 보드(PC 시리얼 모니터) -> 폰  : 양방향 확인용
  if (Serial.available()) {
    BT.write(Serial.read());
  }
}
