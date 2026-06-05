import Phaser from 'phaser';
import { BASE, NUM, COLORS, FONTS, SCENES } from '../../shared/theme.js';
import { fadeIn } from '../fx/transition.js';
import SensorBus from '../../hw/SensorBus.js';
import SerialManager from '../../hw/SerialManager.js';
import CommPanel from '../../story/CommPanel.js';
import CinematicCard from '../../story/CinematicCard.js';
import StoryRunner from '../../story/StoryRunner.js';
import * as sfx from '../fx/sfx.js';
import { SCRIPT, MISSIONS } from '../episodes/space-station/script.js';

// 에피소드 호스트: 별 배경 + 센서버스 + 통신/시네마틱 + 대본 구동.
export default class EpisodeScene extends Phaser.Scene {
  constructor() { super(SCENES.EPISODE); }

  create() {
    fadeIn(this);
    this._starfield();

    this.bus = new SensorBus(this);
    this.comm = new CommPanel(this);
    this.card = new CinematicCard(this);

    this._hud();

    this.runner = new StoryRunner({ scene: this, bus: this.bus, comm: this.comm, card: this.card, missions: MISSIONS, script: SCRIPT });
    this.events.once('episode-complete', () => this._complete());
    this.runner.run();
  }

  update(time, dt) { this.bus?.update(dt); }

  _starfield() {
    this.add.rectangle(0, 0, BASE.w, BASE.h, NUM.bg).setOrigin(0).setDepth(-1000);
    for (let i = 0; i < 90; i++) {
      const s = this.add.circle(Phaser.Math.Between(0, BASE.w), Phaser.Math.Between(0, BASE.h), Phaser.Math.FloatBetween(0.5, 1.6), NUM.text)
        .setAlpha(Phaser.Math.FloatBetween(0.15, 0.7)).setDepth(-999);
      this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(1200, 3000), yoyo: true, repeat: -1 });
    }
  }

  _hud() {
    this.modeTag = this.add.text(24, 20, '● 키보드 모드', { fontFamily: FONTS.display, fontSize: '13px', color: COLORS.info }).setDepth(82000);
    const btn = this.add.text(BASE.w - 24, 20, '[ 기기 연결 ]', { fontFamily: FONTS.display, fontSize: '13px', color: COLORS.eddie })
      .setOrigin(1, 0).setDepth(82000).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', async () => {
      const serial = new SerialManager({ baudRate: 115200 });
      serial.on('error', (e) => this.modeTag.setText('● 연결 실패 — 키보드 모드').setColor(COLORS.warn) || console.warn(e));
      const ok = await serial.connect();
      if (ok) { this.bus.useSerial(serial); this.modeTag.setText('● 하드웨어 연결됨').setColor(COLORS.success); }
    });
    this.bus.on('mode', (m) => this.modeTag.setText(m === 'serial' ? '● 하드웨어 연결됨' : '● 키보드 모드'));

    // 사운드 음소거 토글(톤 가이드 §7) — [기기 연결] 왼쪽
    const label = () => (sfx.isMuted() ? '[ ♪̶ 소리 꺼짐 ]' : '[ ♪ 소리 ]');
    const snd = this.add.text(BASE.w - 24, 44, label(), { fontFamily: FONTS.display, fontSize: '13px', color: COLORS.textDim })
      .setOrigin(1, 0).setDepth(82000).setInteractive({ useHandCursor: true });
    snd.on('pointerdown', () => {
      sfx.setMuted(!sfx.isMuted());
      snd.setText(label()).setColor(sfx.isMuted() ? COLORS.textDim : COLORS.eddie);
    });
  }

  _complete() {
    const o = this.add.rectangle(0, 0, BASE.w, BASE.h, NUM.bg, 0.85).setOrigin(0).setDepth(90000);
    this.add.text(BASE.w / 2, BASE.h / 2 - 20, 'EPISODE 1 — CLEAR', { fontFamily: FONTS.display, fontSize: '40px', color: COLORS.eddie }).setOrigin(0.5).setDepth(90001);
    this.add.text(BASE.w / 2, BASE.h / 2 + 36, '우주 정거장 SOS · 기억 조각 1/?? 복원', { fontFamily: FONTS.kr, fontSize: '18px', color: COLORS.text }).setOrigin(0.5).setDepth(90001);
    const again = this.add.text(BASE.w / 2, BASE.h / 2 + 90, '↺ 다시 플레이', { fontFamily: FONTS.kr, fontSize: '16px', color: COLORS.textDim }).setOrigin(0.5).setDepth(90001).setInteractive({ useHandCursor: true });
    again.on('pointerdown', () => this.scene.restart());
  }
}
