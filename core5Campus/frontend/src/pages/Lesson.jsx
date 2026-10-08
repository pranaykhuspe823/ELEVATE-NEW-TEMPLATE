import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SlidePlayer from '../components/SlidePlayer.jsx';
import { api, download } from '../api.js';

// "- " lines become a bullet list; other lines become paragraphs
function Rich({ text }) {
  const blocks = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('- ')) {
      const last = blocks[blocks.length - 1];
      if (Array.isArray(last)) last.push(line.slice(2)); else blocks.push([line.slice(2)]);
    } else if (line.trim()) blocks.push(line);
  }
  return blocks.map((b, k) => (Array.isArray(b) ? <ul key={k}>{b.map((x) => <li key={x}>{x}</li>)}</ul> : <p key={k}>{b}</p>));
}

function embedUrl(url) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { kind: 'frame', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: 'frame', src: `https://player.vimeo.com/video/${vm[1]}` };
  return { kind: 'file', src: url };
}

function Check({ items }) {
  const [picked, setPicked] = useState({});
  useEffect(() => setPicked({}), [items]);
  const right = items.filter((q, i) => picked[i] === q.a).length;
  return (
    <div className="check">
      {items.map((q, i) => (
        <fieldset key={q.q} className={picked[i] == null ? '' : picked[i] === q.a ? 'is-right' : 'is-wrong'}>
          <legend>{i + 1}. {q.q}</legend>
          {q.options.map((o, j) => (
            <label key={o} className={picked[i] != null && j === q.a ? 'is-answer' : ''}>
              <input type="radio" name={`chk${i}`} checked={picked[i] === j} onChange={() => setPicked({ ...picked, [i]: j })} disabled={picked[i] != null} />
              <span>{o}</span>
            </label>
          ))}
          {picked[i] != null && <p className="check__why" role="status"><strong>{picked[i] === q.a ? 'Correct.' : 'Not quite.'}</strong> {q.why}</p>}
        </fieldset>
      ))}
      {Object.keys(picked).length === items.length && items.length > 0 && <p className="muted">You got {right} of {items.length}. {right < items.length ? 'Review the notes above, then carry on.' : 'Well done.'}</p>}
    </div>
  );
}

export function Outline({ id, course, done, current }) {
  return (
    <nav className="outline" aria-label="Course outline">
      {course.modules.map((m, i) => {
        const finished = m.lessons.filter((_, j) => done.includes(`${i}.${j}`)).length;
        return (
          <details key={m.title} open={current ? current[0] === i : i === 0}>
            <summary><span>Module {i + 1}</span>{m.title}<small>{finished}/{m.lessons.length}</small></summary>
            <ol>
              {m.lessons.map((l, j) => (
                <li key={l.title} className={`${done.includes(`${i}.${j}`) ? 'is-done' : ''} ${current?.[0] === i && current?.[1] === j ? 'is-current' : ''}`}>
                  <Link to={`/learn/${id}/${i}/${j}`}>
                    <span className="outline__tick" aria-label={done.includes(`${i}.${j}`) ? 'Completed' : 'Not completed'} />
                    <span>{l.title}<small>{l.minutes} min{l.video ? ' · video' : ''}</small></span>
                  </Link>
                </li>
              ))}
            </ol>
          </details>
        );
      })}
    </nav>
  );
}

export default function Lesson() {
  const { id, m, l } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('slides');

  useEffect(() => { api(`/me/enrollments/${id}`).then(setCourse).catch((e) => setError(e.message)); }, [id]);
  useEffect(() => {
    setLesson(null); setError('');
    api(`/me/enrollments/${id}/lessons/${m}/${l}`).then((x) => {
      setLesson(x); setView(x.video_url ? 'video' : 'slides');
      document.title = `${x.title} | Core5Campus`;
    }).catch((e) => setError(e.message));
  }, [id, m, l]);

  if (error) return <main className="wrap section"><h1>Lesson unavailable</h1><p>{error} <Link to={`/learn/${id}`}>Back to the course</Link>.</p></main>;
  if (!lesson || !course) return <main className="wrap section"><p className="muted">Loading lesson…</p></main>;

  const label = `Lesson ${lesson.module + 1}.${lesson.lesson + 1}`;
  const mark = async (done, go) => {
    setBusy(true);
    try {
      const r = await api(`/me/enrollments/${id}/lessons`, { method: 'POST', body: { module: lesson.module, lesson: lesson.lesson, done } });
      setCourse({ ...course, lessons_done: r.lessons_done, progress: r.progress });
      setLesson({ ...lesson, done });
      if (go) nav(lesson.next ? `/learn/${id}/${lesson.next[0]}/${lesson.next[1]}` : `/learn/${id}`);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const media = lesson.video_url && embedUrl(lesson.video_url);

  return (
    <main className="wrap learn">
      <aside className="learn__side">
        <Link to={`/learn/${id}`} className="learn__back">← {course.course.title}</Link>
        <Outline id={id} course={course.course} done={course.lessons_done} current={[lesson.module, lesson.lesson]} />
      </aside>

      <article className="learn__main">
        <p className="crumbs"><Link to={`/learn/${id}`}>{lesson.course_title}</Link> / Module {lesson.module + 1}: {lesson.module_title}</p>
        <p className="eyebrow">{label} · {lesson.minutes} min</p>
        <h1 className="learn__title">{lesson.title}</h1>

        {media && (
          <div className="seg" role="tablist" aria-label="Lesson format">
            <button role="tab" aria-selected={view === 'video'} className={view === 'video' ? 'is-active' : ''} onClick={() => setView('video')}>Recorded video</button>
            <button role="tab" aria-selected={view === 'slides'} className={view === 'slides' ? 'is-active' : ''} onClick={() => setView('slides')}>Narrated slides</button>
          </div>
        )}
        {media && view === 'video' ? (
          <div className="video">
            {media.kind === 'frame'
              ? <iframe src={media.src} title={lesson.title} allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              : <video src={media.src} controls preload="metadata" />}
          </div>
        ) : <SlidePlayer lesson={lesson} label={label} />}
        <p className="learn__tools">
          <button className="link" onClick={() => download(`/me/enrollments/${id}/modules/${lesson.module}/slides.pptx`, `core5campus-module-${lesson.module + 1}-slides.pptx`).catch((e) => setError(e.message))}>Download this module’s slides (.pptx)</button>
        </p>

        <section className="lessonbox">
          <h2>What you will learn</h2>
          <ul className="ticks">{lesson.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
        </section>

        <section className="notes">
          <h2>Lesson notes</h2>
          {lesson.sections.map((s) => <div key={s.heading}><h3>{s.heading}</h3><Rich text={s.body} /></div>)}
        </section>

        {lesson.example && (
          <section className="callout">
            <p className="eyebrow">Classroom example</p>
            <h3>{lesson.example.title}</h3>
            <p>{lesson.example.body}</p>
          </section>
        )}

        {lesson.activity.length > 0 && (
          <section className="lessonbox lessonbox--task">
            <h2>Try it now</h2>
            <ol>{lesson.activity.map((a) => <li key={a}>{a}</li>)}</ol>
          </section>
        )}

        {lesson.takeaways.length > 0 && (
          <section>
            <h2>Key takeaways</h2>
            <ul className="ticks">{lesson.takeaways.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
        )}

        {lesson.check.length > 0 && (
          <section>
            <h2>Check your understanding</h2>
            <Check items={lesson.check} />
          </section>
        )}

        <div className="learn__next">
          {lesson.prev ? <Link className="btn btn--secondary" to={`/learn/${id}/${lesson.prev[0]}/${lesson.prev[1]}`}>← Previous</Link> : <span />}
          {lesson.done ? (
            <span className="learn__done">
              <strong>✓ Completed</strong> <button className="link" disabled={busy} onClick={() => mark(false)}>Undo</button>
              {lesson.next && <Link className="btn btn--primary" to={`/learn/${id}/${lesson.next[0]}/${lesson.next[1]}`}>Next lesson →</Link>}
            </span>
          ) : (
            <button className="btn btn--primary" disabled={busy} onClick={() => mark(true, true)}>{lesson.next ? 'Mark complete and continue →' : 'Mark complete'}</button>
          )}
        </div>
      </article>
    </main>
  );
}
