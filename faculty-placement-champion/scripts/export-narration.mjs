// Exports every scene's narration to JSON + CSV so you can feed it to a
// TTS / AI-avatar video pipeline and swap the in-browser "videos" for real MP4s.
import { writeFileSync, mkdirSync } from "node:fs";
import { COURSE, BANK } from "../src/js/course-data.js";

mkdirSync("export", { recursive: true });
const rows = [];
COURSE.forEach((m, mi) => m.scenes.forEach((s, si) => rows.push({
  module: mi + 1, moduleTitle: m.title, scene: si + 1,
  id: `m${mi + 1}-s${si + 1}`, title: s.title, onScreen: s.points.join(" | "), narration: s.say
})));
writeFileSync("export/narration.json", JSON.stringify(rows, null, 2));
const esc = v => `"${String(v).replace(/"/g, '""')}"`;
writeFileSync("export/narration.csv",
  ["id,module,moduleTitle,scene,title,onScreen,narration",
   ...rows.map(r => [r.id, r.module, r.moduleTitle, r.scene, r.title, r.onScreen, r.narration].map(esc).join(","))].join("\n"));
writeFileSync("export/exam-bank.json", JSON.stringify(BANK, null, 2));
console.log(`Exported ${rows.length} scenes and ${BANK.length} exam questions to ./export`);
