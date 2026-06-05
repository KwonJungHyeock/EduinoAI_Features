import Phaser from 'phaser';
import { BASE, NUM, COLORS, FONTS } from '../../../../shared/theme.js';
import { Gauge, keyHint, title, Progress } from './_helpers.js';
import { ensureGlow } from '../../../fx/textures.js';
import * as sfx from '../../../fx/sfx.js';

export default function Power({ scene, bus, interject, onComplete }) {
  const c = scene.add.container(0, 0);
  c.add(title(scene, '미션 4 · 전력 복구'));
  const sun = scene.add.circle(BASE.w / 2 + 220, 250, 26, NUM.amber).setBlendMode(1);
  const hub = scene.add.circle(BASE.w / 2 - 120, 250, 10, NUM.eddie);
  const panel = scene.add.rectangle(BASE.w / 2 - 120, 250, 110, 14, NUM.bg2).setOrigin(0, 0.5).setStrokeStyle(1, NUM.eddie, 0.6);
  const targetAngle = 122; // 태양 방향
  const g = new Gauge(scene, 380, 430, { label: '태양전지판 각도 (태양 방향에 정렬)', min: 0, max: 180, target: [targetAngle - 12, targetAngle + 12] });
  const charge = new Progress(scene, 480, 500);
  c.add([sun, panel, hub, ...g.objs, scene.add.text(360, 494, '전력', { fontFamily: FONTS.kr, fontSize: '15px', color: COLORS.success }), ...charge.objs]);
  const hint = keyHint(scene, BASE.w / 2, 545, 'Q 각도-   E 각도+');
  c.add(hint);

  // --- juice: 충전 파티클(충전바 채움 끝에서 솟는 발광 입자) ---
  const CB = { x: 480, y: 500, w: 320 }; // charge 바 좌표(_helpers Progress와 동일)
  const emitter = scene.add.particles(0, 0, ensureGlow(scene), {
    x: CB.x, y: CB.y,
    lifespan: 650,
    speed: { min: 25, max: 70 },
    angle: { min: -110, max: -70 }, // 위로 솟구침
    gravityY: -30,
    scale: { start: 0.22, end: 0 },
    alpha: { start: 0.85, end: 0 },
    tint: [NUM.amber, NUM.eddie, NUM.success],
    blendMode: 'ADD', // 발광 규칙
    frequency: 55,
    quantity: 1,
    emitting: false,
  }).setDepth(50);

  // --- juice: 충전 험(충전률 추종) ---
  const humCtl = sfx.hum({ baseFreq: 64, topFreq: 190 });

  interject('start');

  let p = 0, halfDone = false;
  const loop = (t, dt) => {
    const a = bus.state.angle;
    g.setValue(a);
    panel.setAngle(a - 90);
    const charging = g.inBand;
    if (charging) p += dt / 2200; else p -= dt / 4000;
    p = Phaser.Math.Clamp(p, 0, 1);
    charge.set(p);

    // 파티클: 충전 중에만, 채움 끝 위치에서 방출
    emitter.emitting = charging && p < 1;
    emitter.setX(CB.x + CB.w * p);
    // 사운드: 충전 중일 때만 충전률에 따라 레벨 상승
    humCtl.setLevel(charging ? 0.35 + 0.65 * p : 0);
    // 태양 맥동 + 허브 점등(충전률에 따라 밝아짐)
    sun.setScale(charging ? 1 + 0.12 * Math.sin(t / 120) : 1);
    hub.setAlpha(0.5 + 0.5 * p);

    if (!halfDone && p > 0.5) {
      halfDone = true;
      sfx.blip({ freq: 880, dur: 0.1 });
      scene.cameras.main.shake(120, 0.003); // 미세 펄스
      interject('half');
    }
    if (p >= 1) {
      scene.events.off('update', loop);
      emitter.emitting = false;
      humCtl.setLevel(0);
      sfx.chime();
      scene.cameras.main.shake(280, 0.006); // 전력 서지
      interject('success');
      onComplete();
    }
  };
  scene.events.on('update', loop);

  const cleanup = () => {
    scene.events.off('update', loop);
    humCtl.stop();
    emitter.destroy();
    g.destroy(); charge.destroy(); c.destroy();
  };
  // 미션 중 씬 재시작 등으로 destroy()가 안 불려도 험 누수 방지
  scene.events.once('shutdown', cleanup);
  return { destroy() { scene.events.off('shutdown', cleanup); cleanup(); } };
}
