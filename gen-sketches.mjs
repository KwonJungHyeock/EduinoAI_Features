/* Node 스크립트: codegen.mjs로부터 기본 설정의 .ino 파일들을 생성한다.
 * 실행: node gen-sketches.mjs   (저장소 루트에서)
 * 웹 미리보기와 저장소의 .ino가 항상 같은 소스에서 나오도록 보장. */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONFIG, STEPS } from "./codegen.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "2WD_RC_Car");   // 스케치 출력 폴더

for (const s of STEPS) {
  const dir = resolve(root, s.folder);
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${s.folder}.ino`);
  writeFileSync(file, s.gen(DEFAULT_CONFIG), "utf8");
  console.log("wrote", `${s.folder}/${s.folder}.ino`);
}
console.log("done.");
