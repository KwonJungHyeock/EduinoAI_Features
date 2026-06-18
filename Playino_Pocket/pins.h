#pragma once
// =====================================================================
// Playino Pocket — 핀맵 (JoyStick Shield V1.A)
// 확인된 표준 배치. 보드 실크/판매처 핀아웃과 다르면 여기만 고치면 됨.
// =====================================================================

// 조이스틱 (아날로그)
#define PIN_JOY_X   A0
#define PIN_JOY_Y   A1
#define PIN_BTN_K    8   // 조이스틱 누름(K)

// 버튼 (택트/아케이드) — 쉴드 기본 active-LOW(눌리면 GND) → INPUT_PULLUP
#define PIN_BTN_A    2
#define PIN_BTN_B    3
#define PIN_BTN_C    4
#define PIN_BTN_D    5
#define PIN_BTN_E    6
#define PIN_BTN_F    7

// I2C OLED(SSD1306 128x64): SDA=A4, SCL=A5 (Uno 하드웨어 I2C 자동)
// nRF24L01: SPI(D11=MOSI,D12=MISO,D13=SCK) + CE/CSN  → Part 2에서 사용
//   (쉴드 nRF 커넥터 기준. CE/CSN 핀은 Part 2에서 보드에 맞춰 확정)
