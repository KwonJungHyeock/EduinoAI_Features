// 우주선 복구 미션 — 순서 고정(배열 순서가 곧 퀘스트 순서).
// 탑뷰 허브가 이 데이터로 스테이션을 배치하고 퀘스트 진행을 관리한다.
// x,y 는 1280×720 좌표(맵 위 스테이션 위치).
export const SHIP_MISSIONS = [
  { key: 'power', icon: '⚡', name: '전력 복구', mission: 'power',
    objective: '발전 패널을 태양 방향에 정렬해 메인 전력을 올려라.', x: 300, y: 250 },
  { key: 'lifesupport', icon: '🌬', name: '생명유지', mission: 'lifesupport',
    objective: '거주 구역 온·습도를 안전 범위로 맞춰라.', x: 980, y: 250 },
  { key: 'attitude', icon: '🧭', name: '자세 제어', mission: 'attitude',
    objective: '기울어진 정거장 자세를 수평으로 안정화하라.', x: 300, y: 500 },
  { key: 'docking', icon: '📡', name: '도킹·통신', mission: 'docking',
    objective: '도킹 포트 거리를 맞춰 통신을 복구하라.', x: 980, y: 500 },
  { key: 'core', icon: '🧠', name: '코어 재가동', mission: 'core',
    objective: '자세와 전력을 동시에 유지해 메인 코어를 재시작하라.', x: 640, y: 375 },
];

// 진행도 저장(localStorage) — 이어하기. 게임은 이 모듈로만 진행도를 다룬다.
const PKEY = 'playino.ep1.progress';
export function loadDone() {
  try { return new Set(JSON.parse(localStorage.getItem(PKEY) || '[]')); }
  catch { return new Set(); }
}
export function markDone(key) {
  const s = loadDone(); s.add(key);
  localStorage.setItem(PKEY, JSON.stringify([...s]));
}
export function resetProgress() { localStorage.removeItem(PKEY); }

// 현재 퀘스트(순서상 아직 안 끝난 첫 미션) / 잠금 여부
export function currentMission(done = loadDone()) {
  return SHIP_MISSIONS.find((m) => !done.has(m.key)) || null;
}
export function isLocked(m, done = loadDone()) {
  const cur = currentMission(done);
  return !done.has(m.key) && cur?.key !== m.key;
}
