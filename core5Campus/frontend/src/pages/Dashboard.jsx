import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BASE, api, download, downloadBadge } from '../api.js';
import { useStore } from '../store.jsx';
import { fmtDate, site } from '../site.js';

function ChangePassword({ user }) {
  const [f, setF] = useState({ current_password: '', new_password: '' });
  const [s, setS] = useState({ busy: false, error: '', done: false });
  const submit = async (e) => {
    e.preventDefault(); setS({ busy: true, error: '', done: false });
    try {
      await api('/auth/me', { method: 'PATCH', body: { name: user.name, phone: user.phone || '', institution: user.institution || '', ...f } });
      setF({ current_password: '', new_password: '' }); setS({ busy: false, error: '', done: true });
    } catch (err) { setS({ busy: false, error: err.message, done: false }); }
  };
  return (
    <section className="catblock">
      <h2>Change password</h2>
      <form className="form form--inline" onSubmit={submit}>
        <label>Current password<input type="password" required value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} autoComplete="current-password" /></label>
        <label>New password <small>at least 8 characters</small><input type="password" required value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} autoComplete="new-password" /></label>
        <button className="btn btn--secondary" disabled={s.busy}>{s.busy ? 'Saving…' : 'Change password'}</button>
      </form>
      {s.error && <p className="form__error" role="alert">{s.error}</p>}
      {s.done && <p className="muted" role="status">Password changed.</p>}
    </section>
  );
}

export default function Dashboard() {
  const { user } = useStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    Promise.all([api('/me/enrollments'), api('/me/certificates')]).then(([enrollments, certificates]) => setData({ enrollments, certificates }))
      .catch((e) => setError(e.message));
  }, []);

  const valid = (data?.certificates || []).filter((c) => c.status === 'valid');
  const year = new Date().getFullYear();
  const hours = valid.filter((c) => c.issued_at.startsWith(String(year))).reduce((n, c) => n + (c.cpd_hours || 0), 0);
  const pct = Math.min(100, Math.round((hours / site.cpdGoal) * 100));
  const copy = (code) => navigator.clipboard?.writeText(`${location.origin}/verify/${code}`).then(() => { setCopied(code); setTimeout(() => setCopied(''), 2000); });

  return (
    <main className="wrap section">
      <h1>My learning</h1>
      <p className="lead">Signed in as {user.name}. This name is printed on your certificates.</p>
      {error && <p className="form__error">{error}</p>}
      {!data && !error && <p className="muted">Loading your courses…</p>}
      {data && (
        <>
          <section className="cpd" aria-label="CPD hours">
            <div><h2>CPD hours in {year}</h2><p><strong>{hours}</strong> of {site.cpdGoal} hours</p></div>
            <div className="meter" role="progressbar" aria-valuemin="0" aria-valuemax={site.cpdGoal} aria-valuenow={Math.min(hours, site.cpdGoal)}><i style={{ width: `${pct}%` }} /></div>
            <p className="muted">Counted from Core5Campus certificates issued this year. NEP 2020 expects {site.cpdGoal} hours a year.</p>
          </section>

          <section className="catblock">
            <h2>My courses</h2>
            {data.enrollments.length === 0 && <div className="empty"><p>You have not enrolled in a course yet.</p><Link className="btn btn--primary" to="/courses">Browse courses</Link></div>}
            <ul className="mycourses">
              {data.enrollments.map((e) => (
                <li key={e.id}>
                  <div>
                    <h3>{e.title}</h3>
                    <p className="muted">Self-paced · enrolled {fmtDate(e.created_at.replace(' ', 'T') + 'Z')}</p>
                    <div className="meter meter--sm" role="progressbar" aria-valuemin="0" aria-valuemax={e.lessons_total} aria-valuenow={e.lessons_done} aria-label="Lessons completed"><i style={{ width: `${e.lessons_total ? (e.lessons_done / e.lessons_total) * 100 : 0}%` }} /></div>
                    <p className="muted">{e.lessons_done} of {e.lessons_total} lessons complete{e.certificate_code ? ' · Certificate earned' : ''}</p>
                  </div>
                  <Link className="btn btn--primary btn--sm" to={`/learn/${e.id}`}>{e.certificate_code ? 'Review course' : e.lessons_done ? 'Continue course' : 'Start course'}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="catblock">
            <h2>My certificates</h2>
            {data.certificates.length === 0 && <p className="muted">Certificates appear here when you pass a course’s final assessment.</p>}
            <ul className="mycourses">
              {data.certificates.map((c) => (
                <li key={c.code} className="mycert">
                  <img className="mycert__badge" src={`${BASE}/badges/${c.slug}.svg?v=5`} alt={`${c.cert_title} badge`} />
                  <div className="mycert__text"><h3>{c.cert_title}</h3><p className="muted">{c.course_title} · issued {fmtDate(c.issued_at.replace(' ', 'T') + 'Z')} · ID {c.code}{c.status === 'revoked' ? ' · Revoked' : ''}</p>
                    {c.status === 'valid' && c.credly_status === 'sent' && <p className="mycert__credly">✓ Sent to your Credly account. Check your email to accept the badge.</p>}</div>
                  {c.status === 'valid' && (
                    <div className="btnrow">
                      <button className="btn btn--primary btn--sm" onClick={() => download(`/certificates/${c.code}/pdf`, `${c.code}.pdf`).catch((e) => setError(e.message))}>Download certificate</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => downloadBadge(c.slug, `${c.code}-badge.png`).catch((e) => setError(e.message))}>Download badge</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => copy(c.code)}>{copied === c.code ? 'Link copied' : 'Copy verification link'}</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {user.role !== 'admin' && <ChangePassword user={user} />}
        </>
      )}
    </main>
  );
}
