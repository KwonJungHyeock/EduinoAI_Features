import Phaser from 'phaser';
import { NUM, SCENES } from '../../shared/theme.js';
import { placeBg, queueSceneBg } from '../assets.js';
import { fadeIn, goTo } from '../fx/transition.js';
import { addVignette } from '../fx/textures.js';
import SensorBus from '../../hw/SensorBus.js';
import CommPanel from '../../story/CommPanel.js';
import { systemOnline } from '../../story/transitions.js';
import { SCRIPT, MISSIONS } from '../episodes/space-station/script.js';
import { markDone } from '../episodes/space-station/ship.js';

// 단일 미션 호스트: 우주선 허브에서 호출. 브리핑→미션(게이지)→디브리핑→복귀.
export default class MissionHostScene extends Phaser.Scene {
  constructor() { super(SCENES.MISSION); }

  init(data) {
    this.missionKey = data?.missionKey;
    this.metaKey = data?.metaKey;
    this.classCode = data?.classCode;
  }

  preload() {
    // 센서별 배경(있으면) — public/assets/<metaKey>/bg.png
    if (this.metaKey) queueSceneBg(this, this.metaKey);
  }

  create() {
    fadeIn(this);
    placeBg(this, `${this.metaKey}-bg`, NUM.bg);
    addVignette(this, -800);
    this._starfield();

    this.bus = new SensorBus(this);
    this.comm = new CommPanel(this);

    const beat = SCRIPT.find((b) => b.type === 'mission' && b.mission === this.missionKey);
    this._run(beat);
  }

  update(time, dt) { this.bus?.update(dt); }

  async _run(beat) {
    // 1) 브리핑
    if (beat?.briefing) {
      await this.comm.say('EDDIE', beat.briefing.objective);
      await this.comm.say('EDDIE', beat.briefing.eddie);
    }
    // 2) 플레이 (+ 통신 인터젝션)
    await new Promise((resolve) => {
      const interject = (at) => {
        const it = (beat?.interjections || []).find((i) => i.at === at);
        if (it) this.comm.say(it.speaker, it.line);
      };
      const ctrl = MISSIONS[this.missionKey]({
        scene: this, bus: this.bus, comm: this.comm, interject,
        onComplete: () => { ctrl.destroy?.(); resolve(); },
      });
      this._ctrl = ctrl;
    });
    // 3) 디브리핑 + 진행도 저장 → 우주선 복귀
    await systemOnline(this);
    for (const ln of (beat?.debrief || [])) await this.comm.say(ln.speaker, ln.line);
    await new Promise((r) => this.time.delayedCall(700, r));
    markDone(this.metaKey);
    goTo(this, SCENES.SHIP, { classCode: this.classCode });
  }

  _starfield() {
    for (let i = 0; i < 50; i++) {
      const s = this.add.circle(Phaser.Math.Between(0, 1280), Phaser.Math.Between(0, 720),
        Phaser.Math.FloatBetween(0.5, 1.5), NUM.text).setAlpha(Phaser.Math.FloatBetween(0.1, 0.5)).setDepth(-900);
      this.tweens.add({ targets: s, alpha: 0.08, duration: Phaser.Math.Between(1200, 3000), yoyo: true, repeat: -1 });
    }
  }
}
