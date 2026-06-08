import Phaser from 'phaser';
import { BASE, NUM, COLORS, FONTS, SCENES } from '../../shared/theme.js';
import { ensureGlow, ensureVignette } from '../fx/textures.js';
import { queueSceneBg, ASSET_ROOT } from '../assets.js';
import { goTo } from '../fx/transition.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() { super(SCENES.PRELOAD); }

  preload() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 40, 'LOADING', {
      fontFamily: FONTS.display, fontSize: '20px', color: COLORS.eddie,
    }).setOrigin(0.5).setAlpha(0.8);

    const barW = 360;
    const back = this.add.rectangle(width / 2, height / 2 + 10, barW, 6, NUM.bg2).setStrokeStyle(1, NUM.eddie, 0.3);
    const bar = this.add.rectangle(width / 2 - barW / 2, height / 2 + 10, 0, 6, NUM.eddie).setOrigin(0, 0.5);
    const pct = this.add.text(width / 2, height / 2 + 34, '0%', { fontFamily: FONTS.body, fontSize: '12px', color: COLORS.textDim }).setOrigin(0.5);
    this.load.on('progress', (p) => { bar.width = barW * p; pct.setText(Math.round(p * 100) + '%'); });

    // 장면 배경을 전역 1회 로드 → 로딩바가 실제 바이트로 움직이고, 각 씬은 즉시 placeBg
    queueSceneBg(this, 'title');
    queueSceneBg(this, 'login');
    queueSceneBg(this, 'coldopen');
    queueSceneBg(this, 'ship');
    // 캐릭터 스프라이트(없으면 절차적 폴백) — 누락돼도 진행
    this.load.image('eddie', `${ASSET_ROOT}/characters/eddie.png`);
    this.load.image('eddie_side', `${ASSET_ROOT}/characters/eddie_side.png`);
    this.load.on('loaderror', (f) => console.info(`[assets] '${f.key}' 누락 → 폴백`));
  }

  create() {
    ensureGlow(this);
    ensureVignette(this);
    goTo(this, SCENES.SPLASH);
  }
}
