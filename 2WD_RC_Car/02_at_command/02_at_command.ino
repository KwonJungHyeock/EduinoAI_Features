/* =====================================================================
 * Step 2 — AT 커맨드 브리지 (모듈 이름/속도 설정)
 * 2WD RC카 코스 — 자동 생성 코드 (배선 설정 반영)
 *
 * [내 배선 설정]
 *   블루투스(HC-06) : 모듈TX -> A0(RX),  모듈RX -> A1(TX, 분압)
 *   초음파 HC-SR04         : Trig=A2, Echo=A3
 *   모터                  : 좌=M1, 우=M2
 * ===================================================================== */
// 시리얼 모니터에 입력한 AT 명령을 블루투스 모듈로 그대로 전달한다.
// * HC-06: 모듈이 폰과 '연결되지 않은' 상태에서만 AT 응답. 줄바꿈(개행) 없이 전송.
// * HM-10: AT 응답은 되지만 명령셋이 일부 다름(아래 README 참고).
#include <SoftwareSerial.h>
SoftwareSerial BT(A0, A1); // (RX, TX)

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
