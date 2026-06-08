import Phaser from 'phaser';
import { BASE, FONTS, COLORS, SCENES } from '../../shared/theme.js';
import Eddie from '../objects/Eddie.js';
import { fadeIn, goTo } from '../fx/transition.js';
import { addVignette } from '../fx/textures.js';

// 브랜드 스플래시: EDDIE 눈빛 점등 → Title. 충분히 보이도록 길게 + 클릭 스킵.
export default class SplashScene extends Phaser.Scene {
  constructor() { super(SCENES.SPLASH); }

  create() {
    const { width, height } = this.scale;
    fadeIn(this, 600);
    addVignette(this);

    const eddie = new Eddie(this, width / 2, height / 2 - 30, 1.15);
    eddie.setAlpha(0);
    this.tweens.add({ targets: eddie, alpha: 1, duration: 900, ease: 'Sine.out' });

    this.add.text(width / 2, height / 2 + 78, 'EDUINO', {
      fontFamily: FONTS.display, fontSize: '18px', color: COLORS.textDim,
    }).setOrigin(0.5).setAlpha(0).setName('brand');
    this.tweens.add({ targets: this.children.getByName('brand'), alpha: 0.75, duration: 900, delay: 500 });

    let advanced = false;
    const go = () => { if (advanced) return; advanced = true; goTo(this, SCENES.TITLE, {}, 600); };

    // 충분히 본 뒤 자동 진행(2.8s) — 또는 1s 후 클릭/Space로 스킵
    this.time.delayedCall(2800, go);
    this.time.delayedCall(1000, () => {
      const skip = this.add.text(width / 2, height - 60, '클릭하여 계속', { fontFamily: FONTS.kr, fontSize: '14px', color: COLORS.textDim })
        .setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: skip, alpha: 0.7, duration: 500 });
      this.input.once('pointerdown', go);
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-ENTER', go);
    });
  }
}
