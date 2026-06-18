# Playino Pocket — EDDIE 무선 레트로 콘솔

JoyStick Shield 기반 **무선 2인 레트로 핸드헬드**. Playino/EDDIE 세계관 연계.
(웹게임 `03_AIoT_SW_...`와 별개의 펌웨어 프로젝트)

## 하드웨어
- Arduino **Uno**
- **JoyStick Shield V1.A** (조이스틱 + 버튼 A~F)
- **I2C OLED SSD1306 128×64** (디스플레이)
- **nRF24L01** (무선, 2인 대전용 — Part 2부터)

> ⚠️ 이 쉴드는 **Nokia 5110 LCD와 nRF24L01이 같은 SPI 핀을 공유**해 동시 사용이 불가합니다.
> 그래서 디스플레이는 **I2C OLED**를 씁니다(SPI를 nRF24 전용으로 비움).

## 핀맵 (`pins.h`)
| 입력 | 핀 |
|---|---|
| 조이스틱 X / Y | A0 / A1 |
| 조이스틱 누름 K | D8 |
| 버튼 A·B·C·D | D2·D3·D4·D5 |
| 버튼 E·F | D6·D7 |
| OLED SDA / SCL | A4 / A5 (I2C) |
| nRF24 (Part2) | D11/12/13(SPI) + CE/CSN |

## OLED 배선 (4선)
쉴드의 I2C 커넥터(있으면) 또는 브레이크아웃된 핀에 연결:
- OLED **VCC → 5V** (또는 3.3V, 모듈 사양 확인)
- OLED **GND → GND**
- OLED **SDA → A4**
- OLED **SCL → A5**

## 라이브러리
Arduino IDE → 라이브러리 매니저에서 설치:
- **U8g2** (by oliver) — OLED
- (Part 2) **RF24** (by TMRh20) — nRF24L01

## 빌드 / 업로드
1. Arduino IDE에서 `Playino_Pocket/Playino_Pocket.ino` 열기
2. 보드: **Arduino Uno**, 포트 선택
3. 업로드(→)

## Part 1에서 확인할 것 (브링업)
업로드하면:
1. **EDDIE 스플래시**(헬멧+두 눈) 1.6초 → 입력 테스트 화면
2. 조이스틱을 움직이면 사각 안의 **점**이 따라 움직임 + X/Y 값 표시
3. 버튼 A~F, 조이스틱 누름(K)을 누르면 해당 글자가 **반전**

→ 이게 다 정상이면 배선 OK. **Part 2(무선)**로 진행합니다.

### 안 될 때
- **화면 안 켜짐/깨짐**: OLED 주소가 0x3C가 아니거나 1.3"(SH1106)일 수 있음 → `.ino` 상단의 SH1106 생성자 주석 참고. 배선(SDA/SCL) 확인.
- **버튼이 항상 눌림/반대**: 쉴드가 active-HIGH면 로직 반전 필요(`== LOW` → `== HIGH`). 알려주시면 맞춰드림.
- **조이스틱 값이 이상**: X/Y 핀(A0/A1) 또는 중심값(≈512) 확인.

## 로드맵
- [x] Part 1 — 하드웨어 브링업 (입력 + OLED)
- [ ] Part 2 — nRF24 무선 링크 테스트 (두 대 패킷 교환)
- [ ] Part 3 — 무선 2인 게임 (Pong → 우주선 도그파이트)
- [ ] 게임 라이브러리 + 웹 플래싱 배포(접속코드)
