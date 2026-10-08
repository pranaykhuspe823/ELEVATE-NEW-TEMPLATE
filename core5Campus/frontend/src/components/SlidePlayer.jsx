import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BASE } from '../api.js';

// Narrated slide lecture. Slides build up point by point while the narration plays, one sentence at a time.
// Narration uses pre-generated neural voice audio (backend/scripts/tts) when available; otherwise the best
// natural voice the browser offers; with sound off, a reading-pace timer.
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
const sentencesOf = (text) => (text || '').trim().split(/(?<=[.!?]["”’)]?)\s+/).map((s) => s.trim()).filter(Boolean);
const readingSeconds = (s, rate) => Math.max(1.6, s.split(/\s+/).length / (2.6 * rate));

// Prefer neural ("Natural"/"Online") voices, then Google's, in US then UK English, to match the recorded voice.
function pickVoice() {
  const en = (synth?.getVoices() || []).filter((v) => /^en[-_]/i.test(v.lang));
  const score = (v) => (/natural|online|neural/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0)
    + (/en[-_]US/i.test(v.lang) ? 1.5 : /en[-_]GB/i.test(v.lang) ? 1 : 0) + (/female|aria|jenny|ava|emma|sonia|libby/i.test(v.name) ? 0.5 : 0);
  return en.sort((a, b) => score(b) - score(a))[0] || null;
}

export default function SlidePlayer({ lesson, label }) {
  // The server sends the deck (intro, slides, takeaways) with sentence lines and audio keys.
  const deck = useMemo(() => lesson.deck || [
    { kind: 'intro', title: lesson.title, points: lesson.objectives, narration: `${label}. ${lesson.title}. In this lesson you will: ${lesson.objectives.join('; ')}.` },
    ...lesson.slides,
    ...(lesson.takeaways.length ? [{ kind: 'outro', title: 'Key takeaways', points: lesson.takeaways, narration: `To sum up. ${lesson.takeaways.join(' ')}` }] : []),
  ].map((s) => ({ ...s, lines: sentencesOf(s.narration), audio: null })), [lesson, label]);
  const recorded = deck.some((s) => s.audio);

  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [sentence, setSentence] = useState(-1);
  const [rate, setRate] = useState(1);
  const [sound, setSound] = useState(recorded || !!synth);
  const [captions, setCaptions] = useState(true);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const run = useRef(0);       // bumps on every start/stop so stale callbacks do nothing
  const timer = useRef(null);
  const audio = useRef(null);
  const box = useRef(null);

  const slide = deck[i];
  const total = deck.length;

  const stop = useCallback(() => {
    run.current += 1;
    clearTimeout(timer.current);
    synth?.cancel();
    if (audio.current) { audio.current.onended = audio.current.onerror = null; audio.current.pause(); audio.current = null; }
  }, []);

  const playFrom = useCallback((index) => {
    stop();
    const id = run.current;
    const s = deck[index];
    const voice = sound && !s.audio ? pickVoice() : null;
    // Load this slide's clips up front so sentences follow each other without gaps
    const clips = sound && s.audio ? s.audio.map((k) => Object.assign(new Audio(`${BASE}/audio/${k}.mp3`), { preload: 'auto' })) : null;
    const step = (k) => {
      if (id !== run.current) return;
      if (k >= s.lines.length) {
        timer.current = setTimeout(() => {
          if (id !== run.current) return;
          if (index + 1 < deck.length) { setI(index + 1); setSentence(-1); playFrom(index + 1); }
          else { setPlaying(false); setSentence(s.lines.length); }
        }, 600);
        return;
      }
      setSentence(k);
      const next = () => step(k + 1);
      if (clips) {
        const a = clips[k];
        audio.current = a;
        a.playbackRate = rateRef.current;
        a.onended = next;
        a.onerror = () => { timer.current = setTimeout(next, readingSeconds(s.lines[k], rateRef.current) * 1000); };
        a.play().catch(a.onerror);
      } else if (sound && synth) {
        const u = new SpeechSynthesisUtterance(s.lines[k]);
        if (voice) { u.voice = voice; u.lang = voice.lang; }
        u.rate = rateRef.current;
        u.onend = next;
        u.onerror = next;
        synth.speak(u);
      } else {
        timer.current = setTimeout(next, readingSeconds(s.lines[k], rateRef.current) * 1000);
      }
    };
    timer.current = setTimeout(() => step(0), 400);
  }, [deck, sound, stop]);

  useEffect(() => () => stop(), [stop]);
  useEffect(() => { stop(); setI(0); setSentence(-1); setPlaying(false); setStarted(false); }, [lesson, stop]);
  // Some browsers load voices asynchronously
  useEffect(() => { if (synth && !synth.getVoices().length) synth.onvoiceschanged = () => {}; }, []);

  const play = () => { setStarted(true); setPlaying(true); playFrom(i); };
  const pause = () => { stop(); setPlaying(false); };
  const go = (n) => {
    const next = Math.max(0, Math.min(total - 1, n));
    setI(next); setSentence(-1);
    if (playing) playFrom(next); else stop();
  };
  // Speed changes apply to the clip that is playing; switching sound on or off restarts the slide
  useEffect(() => { if (audio.current) audio.current.playbackRate = rate; }, [rate]);
  useEffect(() => { if (playing) playFrom(i); }, [sound]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e) => {
    if (e.target.closest('select')) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); playing ? pause() : play(); }
    if (e.key === 'ArrowRight') go(i + 1);
    if (e.key === 'ArrowLeft') go(i - 1);
  };
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.());

  const lines = slide.lines;
  const shown = !playing ? slide.points.length
    : Math.min(slide.points.length, Math.ceil(((sentence + 1) / Math.max(1, lines.length)) * slide.points.length));
  const fill = playing || sentence >= 0 ? Math.min(1, (sentence + 1) / Math.max(1, lines.length)) : 0;
  const minutes = Math.max(1, Math.round(deck.reduce((n, s) => n + s.lines.reduce((a, x) => a + x.split(/\s+/).length / 2.5, 0), 0) / 60));

  return (
    <div className="player" ref={box} tabIndex={0} onKeyDown={onKey} aria-label="Lesson video: narrated slides">
      <div className={`player__stage player__stage--${slide.kind || 'slide'}`} key={i}>
        <div className="player__label">{label} · {i + 1}/{total}</div>
        <h2 className="player__title">{slide.title}</h2>
        {slide.points.length > 0 && (
          <ul className="player__points">
            {slide.points.map((p, k) => <li key={p} className={k < shown ? 'is-in' : ''} style={{ transitionDelay: playing ? '0ms' : `${k * 90}ms` }}>{p}</li>)}
          </ul>
        )}
        {captions && started && sentence >= 0 && sentence < lines.length && <p className="player__caption">{lines[sentence]}</p>}
        {!started && (
          <button className="player__poster" onClick={play} aria-label="Play lesson"><span className="player__big">
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            <span>Play lesson · {minutes} min</span></span>
          </button>
        )}
      </div>

      <div className="player__bar" role="group" aria-label="Video controls">
        <div className="player__track" aria-hidden="true">
          {deck.map((_, k) => (
            <button key={k} tabIndex={-1} onClick={() => go(k)} className="player__seg">
              <i style={{ width: `${k < i ? 100 : k === i ? fill * 100 : 0}%` }} />
            </button>
          ))}
        </div>
        <div className="player__controls">
          <button onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous slide">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h2v12H6zM9.5 12L18 18V6z" fill="currentColor" /></svg>
          </button>
          <button onClick={playing ? pause : play} aria-label={playing ? 'Pause' : 'Play'} className="player__play">
            {playing
              ? <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" /></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>}
          </button>
          <button onClick={() => go(i + 1)} disabled={i === total - 1} aria-label="Next slide">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" fill="currentColor" /></svg>
          </button>
          <span className="player__count">{i + 1} / {total}</span>
          <span className="player__spacer" />
          {(recorded || synth) && (
            <button onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? 'Turn narration off' : 'Turn narration on'} title={sound ? 'Narration on' : 'Narration off'}>
              {sound
                ? <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" fill="currentColor" /></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zm12 .5l1.4-1.4L19.5 11l2.1-2.1L23 10.3 20.9 12.4l2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1z" fill="currentColor" /></svg>}
            </button>
          )}
          <button onClick={() => setCaptions(!captions)} aria-pressed={captions} aria-label="Captions" title="Captions" className={captions ? 'is-on' : ''}>CC</button>
          <label className="sr" htmlFor="player-rate">Speed</label>
          <select id="player-rate" value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            {[0.75, 1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}
          </select>
          <button onClick={fullscreen} aria-label="Full screen" title="Full screen">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3zm10-5h6v5h-2V6h-4zM4 15h2v3h3v2H4zm14 3v-3h2v5h-5v-2z" fill="currentColor" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
