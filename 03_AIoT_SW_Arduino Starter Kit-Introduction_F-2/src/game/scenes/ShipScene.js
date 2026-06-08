import Phaser from 'phaser';
import { BASE, NUM, COLORS, FONTS, SCENES } from '../../shared/theme.js';
import { placeBg } from '../assets.js';
import { fadeIn, goTo } from '../fx/transition.js';
import { addVignette, ensureGlow } from '../fx/textures.js';
import { SHIP_MISSIONS, loadDone, currentMission, isLocked, resetProgress } from '../episodes/space-station/ship.js';
import * as sfx from '../fx/sfx.js';

// 탑뷰 허브: 우주선 내부 사각 맵을 EDDIE가 자유 이동.
// 스테이션을 순서대로만 진행(잠긴 곳은 안내 토스트). 완료 구역은 점등.
export default class ShipScene extends Phaser.Scene {
  constructor() { super(SCENES.SHIP); }

  create(data) {
    this.classCode = data?.classCode;
    this.done = loadDone();
    this.current = currentMission(this.done);
    this.speed = 270;
    this.bounds = { x1: 130, y1: 150, x2: 1150, y2: 630 };

    fadeIn(this);
    this._buildMap();
    this._buildStations();
    this._buildEddie();
    this._buildHud();
    this._buildInput();

    if (!this.current) this.time.delayedCall(400, () => this._ending());
    else this._toast(`현재 임무: ${this.current.icon} ${this.current.name}`, COLORS.eddie, 2600);

    this.events.once('shutdown', () => this.input.removeAllListeners());
  }

  // --- 맵: 배경 아트(있으면) 또는 절차적 우주선 내부 ---
  _buildMap() {
    if (this.textures.exists('ship-bg')) {
      placeBg(this, 'ship-bg', NUM.bg);
    } else {
      this.add.rectangle(0, 0, BASE.w, BASE.h, NUM.bg).setOrigin(0).setDepth(-1000);
      const b = this.bounds;
      // 바닥
      this.add.rectangle(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1, NUM.bg2, 0.6).setOrigin(0).setDepth(-900)
        .setStrokeStyle(2, NUM.eddie, 0.18);
      // 격자(금속 바닥 느낌)
      const g = this.add.graphics().setDepth(-880);
      g.lineStyle(1, NUM.eddie, 0.06);
      for (let x = b.x1; x <= b.x2; x += 64) g.lineBetween(x, b.y1, x, b.y2);
      for (let y = b.y1; y <= b.y2; y += 64) g.lineBetween(b.x1, y, b.x2, y);
    }
    addVignette(this, -800); // 바닥만 어둡게(스테이션·캐릭터는 또렷하게)
  }

  // --- 스테이션(미션 콘솔) ---
  _buildStations() {
    this.stations = SHIP_MISSIONS.map((m) => {
      const done = this.done.has(m.key);
      const locked = isLocked(m, this.done);
      const accent = done ? NUM.success : locked ? NUM.red : NUM.amber;

      const glow = this.add.image(m.x, m.y, ensureGlow(this)).setBlendMode(Phaser.BlendModes.ADD)
        .setTint(accent).setAlpha(done ? 0.35 : locked ? 0.12 : 0.3).setScale(2.4).setDepth(5);
      const box = this.add.rectangle(m.x, m.y, 92, 64, NUM.bg2, 0.95).setStrokeStyle(2, accent, 0.8).setDepth(10);
      const icon = this.add.text(m.x, m.y - 8, m.icon, { fontSize: '26px' }).setOrigin(0.5).setDepth(11);
      const label = this.add.text(m.x, m.y + 40, m.name, { fontFamily: FONTS.kr, fontSize: '13px', color: done ? COLORS.success : COLORS.textDim })
        .setOrigin(0.5).setDepth(11);
      const tag = this.add.text(m.x, m.y + 18, done ? '복구 완료' : locked ? '잠김' : '◉ 현재 임무', {
        fontFamily: FONTS.kr, fontSize: '11px', color: done ? COLORS.success : locked ? COLORS.red : COLORS.eddie,
      }).setOrigin(0.5).setDepth(11);

      // 현재 임무 강조: 점멸 + 웨이포인트
      let pulse = null, way = null;
      if (!done && !locked) {
        pulse = this.tweens.add({ targets: glow, alpha: 0.5, scale: 3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        way = this.add.text(m.x, m.y - 56, '▼', { fontFamily: FONTS.display, fontSize: '22px', color: COLORS.eddie }).setOrigin(0.5).setDepth(12);
        this.tweens.add({ targets: way, y: m.y - 46, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
      return { m, x: m.x, y: m.y, done, locked };
    });
  }

  _buildEddie() {
    const sx = 640, sy = 590;
    this.shadow = this.add.ellipse(sx, sy + 34, 70, 22, 0x000000, 0.35).setDepth(18);
    if (this.textures.exists('eddie')) {
      this.eddie = this.add.image(sx, sy, 'eddie').setScale(0.085).setDepth(20); // 작게(입체감은 그림자+글로우로)
    } else {
      this.eddie = this.add.circle(sx, sy, 18, NUM.eddie).setDepth(20);
    }
    this.eGlow = this.add.image(sx, sy, ensureGlow(this)).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(NUM.eddie).setAlpha(0.22).setScale(2).setDepth(19);
  }

  _buildHud() {
    this.add.rectangle(0, 0, BASE.w, 56, NUM.bg, 0.6).setOrigin(0).setDepth(60000);
    const n = this.done.size, total = SHIP_MISSIONS.length;
    const txt = this.current ? `현재 임무  ${this.current.icon} ${this.current.name}` : '모든 시스템 복구 완료';
    this.questText = this.add.text(24, 14, txt, { fontFamily: FONTS.display, fontSize: '16px', color: COLORS.eddie }).setDepth(60001);
    this.add.text(BASE.w - 24, 14, `복구 ${n}/${total}`, { fontFamily: FONTS.display, fontSize: '15px', color: COLORS.text }).setOrigin(1, 0).setDepth(60001);
    if (this.current) this.add.text(24, 34, this.current.objective, { fontFamily: FONTS.kr, fontSize: '12px', color: COLORS.textDim }).setDepth(60001);
    this.add.text(BASE.w / 2, BASE.h - 22, 'WASD / 방향키 이동      Space 상호작용', { fontFamily: FONTS.kr, fontSize: '13px', color: COLORS.info })
      .setOrigin(0.5).setDepth(60001).setAlpha(0.85);
  }

  _buildInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-SPACE', this._interact, this);
    this.input.keyboard.on('keydown-ENTER', this._interact, this);
    this.input.on('pointerdown', (p) => { this.moveTo = { x: p.worldX, y: p.worldY }; });
    this.input.on('pointerup', () => { this.moveTo = null; });
  }

  update(time, dt) {
    if (this._busy) return;
    const r = dt / 1000;
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;
    if (dx === 0 && dy === 0 && this.moveTo) {
      const ax = this.moveTo.x - this.eddie.x, ay = this.moveTo.y - this.eddie.y;
      if (Math.abs(ax) > 6) dx = Math.sign(ax);
      if (Math.abs(ay) > 6) dy = Math.sign(ay);
    }
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      const b = this.bounds;
      this.eddie.x = Phaser.Math.Clamp(this.eddie.x + (dx / len) * this.speed * r, b.x1 + 20, b.x2 - 20);
      this.eddie.y = Phaser.Math.Clamp(this.eddie.y + (dy / len) * this.speed * r, b.y1 + 30, b.y2 - 20);
      if (this.eddie.setFlipX && dx) this.eddie.setFlipX(dx < 0);
      this.eddie.y += Math.sin(time / 90) * 0.6; // 미세 보브
    }
    this.shadow.setPosition(this.eddie.x, this.eddie.y + 34);
    this.eGlow.setPosition(this.eddie.x, this.eddie.y);

    // 근처 스테이션 하이라이트(상호작용 안내)
    const near = this._nearStation();
    if (near !== this._near) {
      this._near = near;
      this._hintNear?.destroy(); this._hintNear = null;
      if (near) {
        const label = near.done ? '✓ 복구 완료' : near.locked ? '[ Space ] 잠김' : '[ Space ] 임무 시작';
        this._hintNear = this.add.text(near.x, near.y - 78, label, { fontFamily: FONTS.display, fontSize: '14px', color: COLORS.eddie })
          .setOrigin(0.5).setDepth(60001);
      }
    }
  }

  _nearStation() {
    return this.stations.find((s) => Math.hypot(s.x - this.eddie.x, s.y - this.eddie.y) < 80) || null;
  }

  _interact() {
    if (this._busy) return;
    const s = this._nearStation();
    if (!s) return;
    if (s.done) { this._toast(`✓ ${s.m.name}: 이미 복구된 구역입니다.`, COLORS.success); return; }
    if (s.locked) {
      sfx.blip({ freq: 220, dur: 0.12 });
      this._toast(`⚠ 먼저 '${this.current.icon} ${this.current.name}' 부터 완료하세요.`, COLORS.warn);
      return;
    }
    // 현재 임무 → 미션 시작
    this._busy = true;
    sfx.blip({ freq: 880, dur: 0.1 });
    goTo(this, SCENES.MISSION, { missionKey: s.m.mission, metaKey: s.m.key, classCode: this.classCode });
  }

  _toast(text, color = COLORS.text, hold = 1700) {
    this._toastObj?.destroy();
    const t = this.add.text(BASE.w / 2, 86, text, { fontFamily: FONTS.kr, fontSize: '17px', color, backgroundColor: '#0a0e17cc', padding: { x: 14, y: 8 } })
      .setOrigin(0.5).setDepth(70000).setAlpha(0);
    this._toastObj = t;
    this.tweens.add({ targets: t, alpha: 1, duration: 200 });
    this.time.delayedCall(hold, () => this.tweens.add({ targets: t, alpha: 0, duration: 400, onComplete: () => t.destroy() }));
  }

  _ending() {
    this._busy = true;
    sfx.chime();
    this.cameras.main.flash(400, 60, 255, 214);
    const o = this.add.rectangle(0, 0, BASE.w, BASE.h, NUM.bg, 0.85).setOrigin(0).setDepth(90000);
    this.add.text(BASE.w / 2, BASE.h / 2 - 40, '시스템 전체 복구', { fontFamily: FONTS.display, fontSize: '38px', color: COLORS.eddie }).setOrigin(0.5).setDepth(90001);
    this.add.text(BASE.w / 2, BASE.h / 2 + 16, '우주 정거장 SOS — EPISODE 1 CLEAR', { fontFamily: FONTS.kr, fontSize: '18px', color: COLORS.text }).setOrigin(0.5).setDepth(90001);
    const again = this.add.text(BASE.w / 2, BASE.h / 2 + 80, '↺ 처음부터', { fontFamily: FONTS.kr, fontSize: '16px', color: COLORS.textDim })
      .setOrigin(0.5).setDepth(90001).setInteractive({ useHandCursor: true });
    again.on('pointerdown', () => { resetProgress(); this.scene.restart({ classCode: this.classCode }); });
  }
}
