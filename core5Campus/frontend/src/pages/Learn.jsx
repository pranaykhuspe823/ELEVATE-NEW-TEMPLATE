import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, download } from '../api.js';

export default function Learn() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api(`/me/enrollments/${id}`).then((x) => { setD(x); setAnswers(Array(x.quiz.length).fill(null)); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !d) return <main className="wrap section"><h1>Course unavailable</h1><p>{error} <Link to="/dashboard">Back to my learning</Link>.</p></main>;
  if (!d) return <main className="wrap section"><p className="muted">Loading course…</p></main>;

  const done = new Set(d.progress);
  const allDone = done.size >= d.course.modules.length;
  const key = (i, j) => `${i}.${j}`;
  const hasLessons = d.course.modules.some((m) => m.lessons?.length);
  const totalLessons = d.course.modules.reduce((n, m) => n + (m.lessons?.length || 0), 0);
  const doneLessons = d.lessons_done?.length || 0;
  const nextUp = d.course.modules.flatMap((m, i) => (m.lessons || []).map((_, j) => [i, j])).find(([i, j]) => !d.lessons_done.includes(key(i, j)));
  const slides = (i) => download(`/me/enrollments/${id}/modules/${i}/slides.pptx`, `core5campus-module-${i + 1}-slides.pptx`).catch((e) => setError(e.message));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await api(`/me/enrollments/${id}/assessment`, { method: 'POST', body: { answers } });
      setResult(r); if (r.passed) setD({ ...d, certificate_code: r.certificate_code, status: 'completed' });
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <main className="wrap section learnhome">
      <p className="crumbs"><Link to="/dashboard">My learning</Link> / {d.course.title}</p>
      <h1>{d.course.title}</h1>
      <p className="lead">Self-paced. Work through the lessons in order, then take the final assessment to earn your certificate.</p>

      {d.certificate_code && (
        <div className="notice notice--ok"><strong>You earned the {d.course.cert_title} certificate</strong>
          <p>Certificate ID {d.certificate_code}. <button className="link" onClick={() => download(`/certificates/${d.certificate_code}/pdf`, `${d.certificate_code}.pdf`).catch((e) => setError(e.message))}>Download PDF</button> or <Link to={`/verify/${d.certificate_code}`}>open the verification page</Link>.</p></div>
      )}

      {hasLessons ? (
        <>
          <div className="progress">
            <div>
              <p className="progress__num"><strong>{doneLessons}</strong> of {totalLessons} lessons complete</p>
              <div className="meter meter--sm" role="progressbar" aria-valuemin="0" aria-valuemax={totalLessons} aria-valuenow={doneLessons} aria-label="Lessons completed">
                <i style={{ width: `${(doneLessons / totalLessons) * 100}%` }} />
              </div>
            </div>
            {nextUp && <Link className="btn btn--primary" to={`/learn/${id}/${nextUp[0]}/${nextUp[1]}`}>{doneLessons ? 'Continue' : 'Start the first lesson'} →</Link>}
          </div>

          <h2>Modules</h2>
          <p className="muted">Each lesson has a narrated slide lecture, notes, a classroom task and a quick check. A module completes when all its lessons are done.</p>
          <ol className="modcards">
            {d.course.modules.map((m, i) => {
              const n = m.lessons.filter((_, j) => d.lessons_done.includes(key(i, j))).length;
              return (
                <li key={m.title} className={done.has(i) ? 'is-done' : ''}>
                  <div className="modcards__head">
                    <span className="modcards__num">{done.has(i) ? '✓' : i + 1}</span>
                    <div>
                      <h3>{m.title}</h3>
                      <p className="muted small">{n} of {m.lessons.length} lessons · {m.lessons.reduce((a, x) => a + x.minutes, 0)} min</p>
                    </div>
                    <button className="link small" onClick={() => slides(i)}>Slides (.pptx)</button>
                  </div>
                  <ul>
                    {m.lessons.map((l, j) => (
                      <li key={l.title} className={d.lessons_done.includes(key(i, j)) ? 'is-done' : ''}>
                        <Link to={`/learn/${id}/${i}/${j}`}>
                          <span className="outline__tick" aria-label={d.lessons_done.includes(key(i, j)) ? 'Completed' : 'Not completed'} />
                          <span>{l.title}</span>
                          <small>{l.minutes} min{l.video ? ' · video' : ''}</small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <>
          <h2>Modules</h2>
          <p className="muted">Lessons for this course are being prepared. Check back soon.</p>
          <ul className="modules">
            {d.course.modules.map((m, i) => (
              <li key={m.title} className={done.has(i) ? 'is-done' : ''}>
                <span>Module {i + 1}: {m.title}</span>
                <ul>{m.points.map((p) => <li key={p}>{p}</li>)}</ul>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Final assessment</h2>
      {!allDone && <p className="muted">Unlocks when every module is complete. {d.quiz.length} questions, pass mark {d.course.pass_mark}%.</p>}
      {allDone && !d.certificate_code && (
        <form className="quiz" onSubmit={submit}>
          <p>{d.quiz.length} questions. You need {d.course.pass_mark}% to pass and can retake it.</p>
          {d.quiz.map((q, i) => (
            <fieldset key={q.q}>
              <legend>{i + 1}. {q.q}</legend>
              {q.options.map((o, j) => (
                <label key={o}><input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => setAnswers(answers.map((a, k) => (k === i ? j : a)))} /><span>{o}</span></label>
              ))}
            </fieldset>
          ))}
          {result && !result.passed && <div className="notice notice--bad" role="alert"><strong>You scored {result.score}%</strong><p>{result.correct} of {result.total} correct. The pass mark is {result.pass_mark}%. Review the lessons and try again.</p></div>}
          {error && <p className="form__error" role="alert">{error}</p>}
          <button className="btn btn--primary" disabled={busy || answers.some((a) => a === null)}>{busy ? 'Marking…' : 'Submit assessment'}</button>
        </form>
      )}
      {result?.passed && <div className="notice notice--ok" role="status"><strong>Passed with {result.score}%</strong><p>Your certificate is ready above and in My learning.</p></div>}
    </main>
  );
}
