// Lists every narration sentence that still needs an audio file, for scripts/tts/generate_audio.py.
//   node scripts/tts-manifest.js   →  writes .tts-models/manifest.json
import fs from 'node:fs';
import path from 'node:path';
import { courses } from '../src/data/catalog.js';
import { lessonsFor } from '../src/data/lessons/index.js';
import { AUDIO_DIR, VOICE, audioKey, buildDeck } from '../src/data/lessons/deck.js';

const items = new Map();
for (const c of courses) {
  (lessonsFor(c.slug) || []).forEach((mod, i) => mod.forEach((lesson, j) => {
    if (!lesson) return;
    for (const item of buildDeck(lesson, `Lesson ${i + 1}.${j + 1}`)) {
      for (const line of item.lines) items.set(audioKey(line), line);
    }
  }));
}
const missing = [...items].filter(([key]) => !fs.existsSync(path.join(AUDIO_DIR, `${key}.mp3`)));
const out = path.resolve('.tts-models/manifest.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.writeFileSync(out, JSON.stringify({ voice: VOICE, out_dir: AUDIO_DIR, items: missing.map(([key, text]) => ({ key, text })) }, null, 1));
console.log(`${items.size} sentences in total, ${missing.length} need audio. Manifest: ${out}`);
