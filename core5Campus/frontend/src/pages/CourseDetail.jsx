import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, download } from '../api.js';
import LeadForm from '../components/LeadForm.jsx';
import CertificatePreview from '../components/CertificatePreview.jsx';
import { useStore } from '../store.jsx';
import { fmtHours } from '../site.js';

// Small line icons used on this page
const I = {
  lessons: <path d="M4 5h11a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2zM17 9l3-2v10l-3-2" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  pace: <><path d="M4 18a8 8 0 1 1 16 0" /><path d="M12 18l4-5" /></>,
  cert: <><circle cx="12" cy="9" r="5" /><path d="M9 13.5 8 21l4-2 4 2-1-7.5" /></>,
  enrol: <><path d="M12 4v10M7 9l5 5 5-5" /><path d="M5 20h14" /></>,
  learn: <path d="M8 5v14l11-7z" />,
  test: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 9h6M9 13h6M9 17h3" /></>,
  play: <path d="M9 7v10l8-5z" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  google: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v4.5h4.5" /></>,
};
const Icon = ({ name, size = 20 }) => (
  <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[name]}</svg>
);

const SECTIONS = [['overview', 'Overview'], ['how', 'How it works'], ['syllabus', 'Syllabus'], ['certificate', 'Certificate'], ['faq', 'FAQ']];

export default function CourseDetail() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user, ready } = useStore();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrolError, setEnrolError] = useState('');
  const [open, setOpen] = useState(0);

  useEffect(() => {
    setC(null); setError(''); setOpen(0);
    api(`/courses/${slug}`).then((d) => { setC(d); document.title = `${d.title} | Core5Campus`; })
      .catch((e) => setError(e.message));
  }, [slug]);

  // Courses are free: enrolling opens the course straight away. Signed-out visitors sign in first and come back here.
  const enrol = async () => {
    if (!user) return nav(`/login?next=${encodeURIComponent(`/courses/${slug}?enrol=1`)}`);
    setEnrolling(true); setEnrolError('');
    try { const d = await api('/enrollments', { method: 'POST', body: { course_slug: slug } }); nav(`/learn/${d.enrollment_id}`); }
    catch (e) { setEnrolError(e.message); setEnrolling(false); }
  };
  useEffect(() => { if (params.get('enrol') && ready && user && c?.status === 'published') enrol(); }, [c, ready, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <main className="wrap section"><h1>Course not found</h1><p>{error} <Link to="/courses">Browse all courses</Link>.</p></main>;
  if (!c) return <main className="wrap section"><p className="muted">Loading course…</p></main>;

  if (c.status === 'upcoming') return (
    <main className="wrap section two">
      <div><span className="tag">Coming soon</span><h1>{c.title}</h1><p className="lead">{c.tagline}</p><p>We are building this course now. Leave your details and we will write to you when it opens.</p></div>
      <LeadForm type="notify" courseSlug={c.slug} lockCourse compact cta="Tell me when it opens" doneTitle="You are on the list" doneText="We will email you when enrolment opens." />
    </main>
  );

  const hours = fmtHours(c.total_minutes);
  const syllabusPdf = () => download(`/courses/${c.slug}/syllabus.pdf`, `core5campus-${c.slug}-syllabus.pdf`).catch((e) => setEnrolError(e.message));
  const enrolButton = (cls) => (
    <button className={cls} disabled={enrolling} onClick={enrol}>{enrolling ? 'Opening your course…' : 'Enrol and start learning'}</button>
  );
  const steps = [
    { icon: 'enrol', t: 'Enrol', d: 'One click, start any time' },
    { icon: 'learn', t: 'Learn', d: `${c.lesson_count} narrated lessons · ${hours}` },
    { icon: 'test', t: 'Final assessment', d: `${c.assessment_questions} questions · ${c.pass_mark}% to pass` },
    { icon: 'cert', t: 'Get certified', d: `${c.cpd_hours} CPD hours · verifiable online` },
  ];

  return (
    <main className="cd">
      {/* Header with key facts and the enrol card */}
      <header className="cd-hero">
        <div className="wrap cd-hero__grid">
          <div className="cd-hero__text">
            <p className="crumbs"><Link to="/courses">Courses</Link> / {c.category.name}</p>
            <h1>{c.title}</h1>
            <p className="cd-hero__lead">{c.tagline}</p>
            <ul className="cd-facts">
              <li><Icon name="lessons" />{c.lesson_count} lessons</li>
              <li><Icon name="clock" />{hours} of content</li>
              <li><Icon name="pace" />Self-paced</li>
              <li><Icon name="cert" />Certificate · {c.cpd_hours} CPD hours</li>
            </ul>
          </div>
          <aside className="cd-card">
            <p className="cd-card__title">Start learning today</p>
            <ul className="cd-card__list">
              <li><Icon name="check" size={18} />{c.modules.length} modules, {c.lesson_count} narrated slide lessons</li>
              <li><Icon name="check" size={18} />Notes, tasks and a quick check in every lesson</li>
              <li><Icon name="check" size={18} />Slides to download for every module</li>
              <li><Icon name="check" size={18} />{c.cert_title} certificate</li>
            </ul>
            {enrolButton('btn btn--accent btn--block')}
            {enrolError && <p className="form__error" role="alert">{enrolError}</p>}
            <button className="link cd-card__pdf" onClick={syllabusPdf}>Download the syllabus (PDF)</button>
          </aside>
        </div>
      </header>

      {/* Section menu */}
      <nav className="cd-tabs" aria-label="On this page">
        <div className="wrap cd-tabs__bar">
          <div className="cd-tabs__links">{SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</div>
          {enrolButton('btn btn--primary btn--sm cd-tabs__enrol')}
        </div>
      </nav>

        <section id="overview" className="zone zone--white cd-sec"><div className="wrap">
          <p className="eyebrow">Overview</p>
          <h2>What you’ll learn</h2>
          <ul className="cd-learn">
            {c.outcomes.map((o) => <li key={o.t}><Icon name="check" size={18} /><div><strong>{o.t}</strong><span>{o.d}</span></div></li>)}
          </ul>
          {c.tools?.length > 0 && (
            <div className="cd-row"><h3>Tools covered</h3><ul className="chips">{c.tools.map((t) => <li key={t}>{t}</li>)}</ul></div>
          )}
          <div className="cd-row"><h3>Who it’s for</h3><p className="cd-for">{c.audience.join(' · ')}</p></div>
        </div></section>

        <section id="how" className="zone zone--green cd-sec"><div className="wrap">
          <p className="eyebrow">How it works</p>
          <h2>Four steps to your certificate</h2>
          <ol className="flow">
            {steps.map((s, i) => (
              <li key={s.t} className="flow__step">
                <span className="flow__icon"><Icon name={s.icon} size={22} /></span>
                <span className="flow__num">Step {i + 1}</span>
                <strong>{s.t}</strong>
                <span className="flow__desc">{s.d}</span>
              </li>
            ))}
          </ol>
          {c.external_certs?.length > 0 && (
            <div className="flow__next">
              <span className="flow__next-label">Optional next step</span>
              {c.external_certs.map((x) => (
                <div key={x.name} className="flow__ext"><Icon name="google" size={18} /><div><strong>{x.name}</strong><span>{x.by}. {x.note}</span></div></div>
              ))}
            </div>
          )}
        </div></section>

        <section id="syllabus" className="zone zone--white cd-sec"><div className="wrap">
          <div className="cd-sec__head">
            <div><p className="eyebrow">Syllabus</p><h2>What’s inside the course</h2></div>
            <p className="muted">{c.modules.length} modules · {c.lesson_count} lessons · {hours}</p>
          </div>
          <ol className="mods">
            {c.modules.map((m, i) => {
              const min = m.lessons.reduce((n, l) => n + (l.minutes || 0), 0);
              const isOpen = open === i;
              return (
                <li key={m.title} className={isOpen ? 'is-open' : ''}>
                  <button className="mods__head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span className="mods__num">{i + 1}</span>
                    <span className="mods__title"><strong>{m.title}</strong><small>{m.lessons.length} lessons{min ? ` · ${min} min` : ''}</small></span>
                    <Icon name="chevron" />
                  </button>
                  {isOpen && (
                    <ul className="mods__lessons">
                      {m.lessons.map((l) => <li key={l.title}><Icon name="play" size={16} /><span>{l.title}</span>{l.minutes && <small>{l.minutes} min</small>}</li>)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </div></section>

        <section id="certificate" className="zone zone--cream cd-sec"><div className="wrap cd-cert">
          <div>
            <p className="eyebrow">Certificate</p>
            <h2>Your certificate</h2>
            <p className="lead">Finish every lesson and score {c.pass_mark}% or more in the final assessment to earn the <strong>{c.cert_title}</strong> certificate.</p>
            <ul className="ticks">
              <li>{c.cpd_hours} CPD hours you can count towards the 50 hours a year NEP 2020 expects</li>
              <li>A unique certificate ID and QR code</li>
              <li>Anyone can check it on our verification page</li>
              <li>Download it as a PDF from My learning</li>
            </ul>
          </div>
          <CertificatePreview title={c.cert_title} slug={c.slug} cpd={c.cpd_hours} code={`C5C-${c.cert_prefix}-26-7K2M9Q`} />
        </div></section>

        <section id="faq" className="zone zone--green cd-sec"><div className="wrap">
          <p className="eyebrow">FAQ</p>
          <h2>Frequently asked questions</h2>
          <div className="acc">{c.faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        </div></section>

      <section className="cd-cta">
        <div className="wrap cd-cta__inner">
          <div><h2>Ready to start?</h2><p>{c.lesson_count} lessons · {hours} · self-paced · certificate on completion</p></div>
          <div className="cd-cta__actions">
            {enrolButton('btn btn--accent')}
            <Link className="cd-cta__ask" to="/contact">Have a question? Contact us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
