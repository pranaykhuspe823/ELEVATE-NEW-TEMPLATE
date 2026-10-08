"""Generate lesson narration audio with Kokoro (local, offline neural text-to-speech).

Run from /backend:
    node scripts/tts-manifest.js
    .venv-tts/Scripts/python scripts/tts/generate_audio.py

Reads .tts-models/manifest.json and writes one MP3 per sentence into media/audio/<key>.mp3.
Files that already exist are skipped, so the script can be stopped and resumed at any time.
"""
import json
import os
import re
import sys
import time

import soundfile as sf
from kokoro_onnx import Kokoro

MODELS = ".tts-models"
VOICE_LANG = {"a": "en-us", "b": "en-gb"}  # Kokoro voice prefixes: a = American, b = British

# Spoken forms for things a text-to-speech model tends to misread. The audio key uses the original text.
REPLACEMENTS = [
    (r"\bCore5Campus\b", "Core Five Campus"),
    (r"\bCore5\b", "Core Five"),
    (r"₹\s?([\d,]+)", r"\1 rupees"),
    (r"\be\.g\.", "for example"),
    (r"\bi\.e\.", "that is"),
    (r"(\d)\s?%", r"\1 percent"),
    (r"\b5E\b", "five E"),
    (r"\bLesson (\d+)\.(\d+)\b", r"Lesson \1 point \2"),
    (r"\s&\s", " and "),
    (r"[“”]", '"'),
    (r"[‘’]", "'"),
    (r"–|—", ", "),
]


def speakable(text):
    for pattern, repl in REPLACEMENTS:
        text = re.sub(pattern, repl, text)
    return text


def main():
    manifest = json.load(open(os.path.join(MODELS, "manifest.json"), encoding="utf-8"))
    voice, out_dir, items = manifest["voice"], manifest["out_dir"], manifest["items"]
    lang = VOICE_LANG.get(voice[0], "en-us")
    os.makedirs(out_dir, exist_ok=True)
    todo = [i for i in items if not os.path.exists(os.path.join(out_dir, i["key"] + ".mp3"))]
    print(f"{len(todo)} sentences to generate with voice {voice} ({lang})", flush=True)
    if not todo:
        return

    kokoro = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    started, audio_seconds = time.time(), 0.0
    for n, item in enumerate(todo, 1):
        samples, rate = kokoro.create(speakable(item["text"]), voice=voice, speed=1.0, lang=lang)
        tmp = os.path.join(out_dir, item["key"] + ".tmp.mp3")
        sf.write(tmp, samples, rate, format="MP3")
        os.replace(tmp, os.path.join(out_dir, item["key"] + ".mp3"))  # never leave half-written files
        audio_seconds += len(samples) / rate
        if n % 25 == 0 or n == len(todo):
            elapsed = time.time() - started
            eta = elapsed / n * (len(todo) - n)
            print(f"[{n}/{len(todo)}] {audio_seconds / 60:.1f} min of audio, {elapsed / 60:.1f} min elapsed, ~{eta / 60:.0f} min left", flush=True)
    print("Done.", flush=True)


if __name__ == "__main__":
    sys.exit(main())
