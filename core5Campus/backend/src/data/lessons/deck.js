// The narrated "video" for a lesson: an intro card, the lesson slides and a takeaways card,
// each split into sentences. Each sentence has a stable key used to name its pre-generated audio file.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const VOICE = process.env.TTS_VOICE || 'af_heart';
export const AUDIO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../media/audio');

// Split after . ! ? followed by a space, so numbers like "1.2" and "9.5" stay whole.
export const sentencesOf = (text) => (text || '').trim().split(/(?<=[.!?]["”’)]?)\s+/).map((s) => s.trim()).filter(Boolean);
export const audioKey = (sentence) => crypto.createHash('sha1').update(`${VOICE}:${sentence}`).digest('hex').slice(0, 20);

export function buildDeck(lesson, label) {
  const items = [
    { kind: 'intro', title: lesson.title, points: lesson.objectives, narration: `${label}. ${lesson.title}. In this lesson you will: ${lesson.objectives.join('; ')}.` },
    ...lesson.slides.map((s) => ({ kind: 'slide', ...s })),
    ...(lesson.takeaways.length ? [{ kind: 'outro', title: 'Key takeaways', points: lesson.takeaways, narration: `To sum up. ${lesson.takeaways.join(' ')}` }] : []),
  ];
  return items.map((item) => ({ ...item, lines: sentencesOf(item.narration) }));
}

/** Deck with audio keys attached to items whose sentences all have audio files. */
export function deckWithAudio(lesson, label) {
  return buildDeck(lesson, label).map((item) => {
    const keys = item.lines.map(audioKey);
    const ready = keys.length > 0 && keys.every((k) => fs.existsSync(path.join(AUDIO_DIR, `${k}.mp3`)));
    return { ...item, audio: ready ? keys : null };
  });
}
