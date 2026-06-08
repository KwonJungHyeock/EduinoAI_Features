// 단일 관리: 해상도 · 팔레트 · 폰트 · 씬키 (스펙 §2,§4,§5)

export const BASE = { w: 1280, h: 720 };

// 문자열(CSS/Phaser text) + 숫자(Phaser fill/tint) 둘 다 제공
export const COLORS = {
  bg:        '#04060b',
  bg2:       '#0a0e17',
  eddie:     '#6fffd6', // EDDIE 눈빛 시그니처
  amber:     '#ffb020',
  red:       '#ff5a3c',
  success:   '#3ddc91',
  info:      '#6fb7ff',
  warn:      '#ffd11a',
  text:      '#e6edf7',
  textDim:   '#8b97ad',
};

export const toNum = (hex) => parseInt(hex.replace('#', '0x'));
export const NUM = Object.fromEntries(
  Object.entries(COLORS).map(([k, v]) => [k, toNum(v)])
);

export const FONTS = {
  display: 'Orbitron',          // 영문 제목
  body:    '"Space Grotesk"',   // 영문 본문
  kr:      'Pretendard',        // 한글
};

// 화면 1개 = 씬 1개 (스펙 §6)
export const SCENES = {
  BOOT:    'Boot',
  PRELOAD: 'Preload',
  SPLASH:  'Splash',
  TITLE:   'Title',
  LOGIN:   'Login',
  COLDOPEN:'ColdOpen',
  SHIP:    'Ship',
  MISSION: 'MissionHost',
  HUB:     'ComingSoon',
  EPISODE: 'Episode',
};
