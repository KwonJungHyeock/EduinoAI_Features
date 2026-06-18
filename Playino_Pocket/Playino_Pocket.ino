// =====================================================================
// Playino Pocket — EDDIE 무선 레트로 콘솔
// Part 1: 하드웨어 브링업 (OLED 표시 + 조이스틱/버튼 입력 확인)
//   - 무선(nRF24)은 아직 사용하지 않음. 먼저 배선이 맞는지 확정하는 단계.
//   - 라이브러리: U8g2 (by oliver)  ← Library Manager에서 "U8g2" 설치
// 보드: Arduino Uno + JoyStick Shield V1.A + I2C OLED(SSD1306 128x64)
// =====================================================================
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>
#include "pins.h"

// SSD1306 128x64 I2C, 풀 프레임버퍼(F) — 게임용. (화면이 1.3" SH1106면 아래 주석 참고)
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);
// 1.3" 모듈이 깨져 보이면 위 줄을 지우고 아래 줄을 사용:
// U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

const uint8_t BTN_PIN[7]  = { PIN_BTN_A, PIN_BTN_B, PIN_BTN_C, PIN_BTN_D, PIN_BTN_E, PIN_BTN_F, PIN_BTN_K };
const char*   BTN_NAME[7] = { "A", "B", "C", "D", "E", "F", "K" };

void setup() {
  for (uint8_t i = 0; i < 7; i++) pinMode(BTN_PIN[i], INPUT_PULLUP);
  u8g2.begin();
  splash();
}

// EDDIE 부팅 스플래시 — 헬멧 + 빛나는 두 눈(시그니처)
void splash() {
  u8g2.clearBuffer();
  u8g2.drawRBox(44, 12, 40, 30, 7);            // 헬멧
  u8g2.setDrawColor(0);
  u8g2.drawRBox(52, 22, 9, 9, 2);              // 왼눈(반전=빛남)
  u8g2.drawRBox(67, 22, 9, 9, 2);              // 오른눈
  u8g2.setDrawColor(1);
  u8g2.setFont(u8g2_font_6x12_tf);
  u8g2.drawStr(20, 58, "PLAYINO POCKET");
  u8g2.sendBuffer();
  delay(1600);
}

void loop() {
  int jx = analogRead(PIN_JOY_X);
  int jy = analogRead(PIN_JOY_Y);

  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_5x7_tf);
  u8g2.drawStr(0, 7, "Part1: INPUT TEST");

  // 조이스틱 위치 점
  const int cx = 100, cy = 26, r = 18;
  u8g2.drawFrame(cx - r, cy - r, 2 * r, 2 * r);
  int px = constrain(cx + (int)((jx - 512) / 512.0 * r), cx - r, cx + r);
  int py = constrain(cy + (int)((jy - 512) / 512.0 * r), cy - r, cy + r);
  u8g2.drawDisc(px, py, 3);

  char buf[20];
  snprintf(buf, sizeof(buf), "X%4d", jx); u8g2.drawStr(0, 22, buf);
  snprintf(buf, sizeof(buf), "Y%4d", jy); u8g2.drawStr(0, 32, buf);

  // 버튼 상태 (눌리면 박스 반전)
  u8g2.drawStr(0, 47, "BTN");
  int x = 22;
  for (uint8_t i = 0; i < 7; i++) {
    bool pressed = digitalRead(BTN_PIN[i]) == LOW;
    if (pressed) u8g2.drawBox(x - 1, 40, 11, 9);
    u8g2.setDrawColor(pressed ? 0 : 1);
    u8g2.drawStr(x, 47, BTN_NAME[i]);
    u8g2.setDrawColor(1);
    x += 14;
  }

  u8g2.drawStr(0, 62, "wire OK? -> Part2: radio");
  u8g2.sendBuffer();
  delay(30);
}
