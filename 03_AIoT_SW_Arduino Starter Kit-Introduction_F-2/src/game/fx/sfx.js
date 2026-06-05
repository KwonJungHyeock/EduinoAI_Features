// 절차적 효과음 합성 (WebAudio) — 사운드 에셋·외부 라이브러리 없이 동작.
// best-effort: AudioContext를 못 쓰면 조용히 무시(오프라인/차단 환경 보장).
// mute 토글 제공(톤 가이드 §7). 발광=ADD처럼, 소리는 전부 여기로 모은다(재사용).

let ctx = null;
let master = null;
let muted = false;

// AudioContext lazy 생성 + suspend 해제(사용자 입력 후 호출되면 resume됨).
function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch { ctx = null; master = null; return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.value = muted ? 0 : 0.5;
}
export function isMuted() { return muted; }

// 짧은 블립(단발 신호음)
export function blip({ freq = 660, dur = 0.09, type = 'triangle', vol = 0.22 } = {}) {
  const ac = ensure();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// 상승 차임(성공 안도감) — 음을 순차로 쌓아 올림
export function chime(notes = [523.25, 659.25, 783.99, 1046.5], step = 0.11) {
  const ac = ensure();
  if (!ac) return;
  notes.forEach((f, i) => {
    const t = ac.currentTime + i * step;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 0.45);
  });
}

// 지속 험(충전 루프) — setLevel(0..1)로 음높이/볼륨 추종, stop()으로 해제.
// AudioContext가 없으면 no-op 핸들을 돌려준다(호출부는 분기 불필요).
export function hum({ baseFreq = 64, topFreq = 190 } = {}) {
  const ac = ensure();
  if (!ac) return { setLevel() {}, stop() {} };
  const osc = ac.createOscillator();
  const sub = ac.createOscillator();
  const g = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  osc.type = 'sawtooth';
  sub.type = 'sine';
  g.gain.value = 0;
  osc.connect(lp);
  sub.connect(lp);
  lp.connect(g);
  g.connect(master);
  const t0 = ac.currentTime;
  osc.start(t0);
  sub.start(t0);
  let stopped = false;
  return {
    setLevel(v) {
      if (stopped || !ctx) return;
      const lv = Math.max(0, Math.min(1, v));
      const t = ctx.currentTime;
      const f = baseFreq + (topFreq - baseFreq) * lv;
      osc.frequency.setTargetAtTime(f, t, 0.08);
      sub.frequency.setTargetAtTime(f / 2, t, 0.08);
      lp.frequency.setTargetAtTime(400 + 1600 * lv, t, 0.1);
      g.gain.setTargetAtTime(0.18 * lv, t, 0.06);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      if (!ctx) return;
      const t = ctx.currentTime;
      g.gain.setTargetAtTime(0, t, 0.05);
      try { osc.stop(t + 0.25); sub.stop(t + 0.25); } catch {}
    },
  };
}
