import { useCallback, useEffect, useState } from 'react';
import { api, download } from '../api.js';
import { useStore } from '../store.jsx';
import { fmtDate, fmtDateTime, fmtHours } from '../site.js';

const TABS = ['Overview', 'Enquiries', 'Enrolments', 'Courses', 'Lesson videos', 'Certificates', 'Webinars', 'Learners'];
const LEAD_TYPES = { enquiry: 'Enquiry', syllabus: 'Syllabus download', school_pd: 'School programme', notify: 'Notify me', contact: 'Contact' };

function useData(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => api(path).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message)), [path]);
  useEffect(() => { load(); }, [load]);
  return { data, error, load, setError };
}
const act = (fn, load, setError) => async (...a) => { try { await fn(...a); await load(); } catch (e) { setError(e.message); } };
const Status = ({ error, data }) => (error ? <p className="form__error" role="alert">{error}</p> : !data ? <p className="muted">Loading…</p> : null);

function Overview() {
  const { data, error } = useData('/admin/overview');
  if (!data) return <Status error={error} data={data} />;
  return (
    <>
      <dl className="stats">
        <div><dt>New enquiries</dt><dd>{data.enquiries_new}</dd></div>
        <div><dt>Learners</dt><dd>{data.learners}</dd></div>
        <div><dt>Enrolments</dt><dd>{data.enrollments_active}</dd></div>
        <div><dt>Certificates issued</dt><dd>{data.certificates}</dd></div>
      </dl>
      <div className="tablewrap"><table className="table">
        <thead><tr><th>Course</th><th>Enquiries</th><th>Enrolments</th></tr></thead>
        <tbody>{data.by_course.map((c) => <tr key={c.title}><td>{c.title}</td><td>{c.enquiries}</td><td>{c.enrollments}</td></tr>)}</tbody>
      </table></div>
    </>
  );
}

function Enquiries() {
  const [filter, setFilter] = useState('');
  const { data, error, load, setError } = useData(`/admin/enquiries${filter ? `?status=${filter}` : ''}`);
  const setStatus = act((id, status) => api(`/admin/enquiries/${id}`, { method: 'PATCH', body: { status } }), load, setError);
  return (
    <>
      <div className="toolbar">
        <label>Show<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All</option><option value="new">New</option><option value="contacted">Contacted</option><option value="converted">Converted</option><option value="closed">Closed</option></select></label>
        <button className="btn btn--ghost btn--sm" onClick={() => download('/admin/enquiries.csv', 'core5-enquiries.csv').catch((e) => setError(e.message))}>Export CSV</button>
      </div>
      <Status error={error} data={data} />
      {data && data.length === 0 && <p className="muted">No enquiries here yet. They appear as soon as someone submits a form on the site.</p>}
      {data && data.length > 0 && (
        <div className="tablewrap"><table className="table">
          <thead><tr><th>Received</th><th>Person</th><th>Type</th><th>Course</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>{data.map((q) => (
            <tr key={q.id}>
              <td>{fmtDate(q.created_at.replace(' ', 'T') + 'Z')}</td>
              <td><b>{q.name}</b><br /><a href={`mailto:${q.email}`}>{q.email}</a>{q.phone && <><br />{q.phone}</>}{q.institution && <><br /><small>{q.role ? `${q.role}, ` : ''}{q.institution}</small></>}</td>
              <td>{LEAD_TYPES[q.type] || q.type}</td>
              <td>{q.course_slug || '—'}</td>
              <td>{q.message}{q.meta && <small><br />{Object.entries(JSON.parse(q.meta)).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')}</small>}</td>
              <td><select aria-label={`Status for ${q.name}`} value={q.status} onChange={(e) => setStatus(q.id, e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="converted">Converted</option><option value="closed">Closed</option></select></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}

function Enrolments() {
  const { data, error, load, setError } = useData('/admin/enrollments');
  const setStatus = act((id, status) => api(`/admin/enrollments/${id}`, { method: 'PATCH', body: { status } }), load, setError);
  const issue = act((id) => api(`/admin/enrollments/${id}/certificate`, { method: 'POST' }), load, setError);
  return (
    <>
      <Status error={error} data={data} />
      {data && data.length === 0 && <p className="muted">No enrolments yet.</p>}
      {data && data.length > 0 && (
        <div className="tablewrap"><table className="table">
          <thead><tr><th>Learner</th><th>Course</th><th>Enrolled</th><th>Progress</th><th>Status</th><th>Certificate</th></tr></thead>
          <tbody>{data.map((e) => (
            <tr key={e.id}>
              <td><b>{e.name}</b><br />{e.email}</td>
              <td>{e.course}</td>
              <td>{fmtDate(e.created_at.replace(' ', 'T') + 'Z')}</td>
              <td>{e.lessons_done} of {e.lessons_total} lessons{e.quiz_score != null && <><br />Score {e.quiz_score}%</>}</td>
              <td><select aria-label={`Status for ${e.name}`} value={e.status === 'completed' ? 'active' : e.status} disabled={e.status === 'completed'} onChange={(ev) => setStatus(e.id, ev.target.value)}>
                <option value="active">{e.status === 'completed' ? 'Completed' : 'Active'}</option><option value="cancelled">Cancelled</option></select></td>
              <td>{e.certificate_code || (e.status === 'active' ? <button className="btn btn--ghost btn--sm" onClick={() => issue(e.id)}>Issue certificate</button> : '—')}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}

function CoursesAdmin() {
  const { loadCatalog } = useStore();
  const { data, error, load, setError } = useData('/admin/courses');
  const save = act(async (id, status) => { await api(`/admin/courses/${id}`, { method: 'PATCH', body: { status } }); loadCatalog(); }, load, setError);
  const saveTemplate = act((id, credly_template_id) => api(`/admin/courses/${id}`, { method: 'PATCH', body: { credly_template_id } }), load, setError);
  return (
    <>
      <p className="muted">Courses are free and self-paced. Learners enrol instantly and earn the certificate by completing every lesson and passing the final assessment.</p>
      <Status error={error} data={data} />
      {data && (
        <div className="tablewrap"><table className="table">
          <thead><tr><th>Course</th><th>Lessons</th><th>CPD hours</th><th>Enrolled</th><th>Credly badge template ID</th><th>Visibility</th></tr></thead>
          <tbody>{data.map((c) => (
            <tr key={c.id}>
              <td><b>{c.title}</b></td>
              <td>{c.lesson_count} · {fmtHours(c.total_minutes)}</td>
              <td>{c.cpd_hours}</td>
              <td>{c.enrolled}</td>
              <td><CredlyTemplate value={c.credly_template_id || ''} onSave={(v) => saveTemplate(c.id, v)} /></td>
              <td><select aria-label={`Visibility of ${c.title}`} value={c.status} onChange={(e) => save(c.id, e.target.value)}>
                <option value="published">Published</option><option value="upcoming">Coming soon</option><option value="hidden">Hidden</option></select></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}

function CredlyTemplate({ value, onSave }) {
  const [v, setV] = useState(value);
  return (
    <form className="inlineform" onSubmit={(e) => { e.preventDefault(); onSave(v.trim()); }}>
      <input aria-label="Credly badge template ID" value={v} onChange={(e) => setV(e.target.value)} placeholder="Not set" />
      <button className="btn btn--ghost btn--sm" disabled={v === value}>Save</button>
    </form>
  );
}

function LessonVideos() {
  const { published } = useStore();
  const [slug, setSlug] = useState('');
  const course = slug || published[0]?.slug || '';
  const { data, error, load, setError } = useData(course ? `/admin/lessons/${course}` : '/admin/overview');
  const save = act((m, l, video_url) => api(`/admin/lessons/${course}/${m}/${l}`, { method: 'PUT', body: { video_url } }), load, setError);
  return (
    <>
      <p className="muted">Every lesson already has a narrated slide lecture. Paste a YouTube, Vimeo or .mp4 link to add a recorded video; learners can switch between the two. Leave a box empty to remove a video.</p>
      <label className="toolbar">Course
        <select value={course} onChange={(e) => setSlug(e.target.value)}>{published.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select>
      </label>
      <Status error={error} data={data} />
      {Array.isArray(data) && data.map((m, i) => (
        <section className="admincard" key={m.title}>
          <h3>Module {i + 1}: {m.title}</h3>
          {m.lessons.map((l, j) => <VideoRow key={`${course}${i}.${j}`} label={`${i + 1}.${j + 1} ${l.title}`} url={l.video_url} onSave={(u) => save(i, j, u)} />)}
        </section>
      ))}
    </>
  );
}
function VideoRow({ label, url, onSave }) {
  const [v, setV] = useState(url);
  return (
    <form className="form form--inline" onSubmit={(e) => { e.preventDefault(); onSave(v.trim()); }}>
      <label>{label}<input value={v} onChange={(e) => setV(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></label>
      <button className="btn btn--ghost btn--sm" disabled={v === url}>Save</button>
    </form>
  );
}

function Certificates() {
  const { data, error, load, setError } = useData('/admin/certificates');
  const setStatus = act((id, status) => api(`/admin/certificates/${id}`, { method: 'PATCH', body: { status } }), load, setError);
  const credly = useData('/admin/credly').data;
  const sendCredly = act((id) => api(`/admin/certificates/${id}/credly`, { method: 'POST' }), load, setError);
  return (
    <>
      {credly && !credly.connected && <div className="notice notice--warn"><strong>Credly is not connected</strong><p>Add CREDLY_ORG_ID and CREDLY_API_TOKEN to backend/.env and restart the server, then set each course’s Credly badge template ID under Courses. Certificates will then be sent to learners’ Credly accounts automatically.</p></div>}
      {credly?.connected && <p className="muted">Credly is connected{credly.sandbox ? ' (sandbox)' : ''}. Each new certificate is sent to the learner’s registered email on Credly.</p>}
      <Status error={error} data={data} />
      {data && data.length === 0 && <p className="muted">No certificates issued yet. They are created when a learner passes the assessment, or when you issue one from Enrolments.</p>}
      {data && data.length > 0 && (
        <div className="tablewrap"><table className="table">
          <thead><tr><th>ID</th><th>Holder</th><th>Certificate</th><th>Issued</th><th>Score</th><th>Credly</th><th></th></tr></thead>
          <tbody>{data.map((c) => (
            <tr key={c.id}>
              <td><a href={`/verify/${c.code}`} target="_blank" rel="noreferrer">{c.code}</a></td>
              <td><b>{c.holder_name}</b><br />{c.email}</td><td>{c.cert_title}</td>
              <td>{fmtDate(c.issued_at.replace(' ', 'T') + 'Z')}</td><td>{c.score != null ? `${c.score}%` : '—'}</td>
              <td>{{"sent":"Sent to Credly","failed":"Failed","skipped":"Not sent","none":"Not sent"}[c.credly_status] || 'Not sent'}{c.credly_error && <><br /><small className="muted">{c.credly_error}</small></>}
                {c.status === 'valid' && c.credly_status !== 'sent' && <><br /><button className="link" onClick={() => sendCredly(c.id)}>Send to Credly</button></>}</td>
              <td className="btnrow">
                {c.status === 'valid' && <button className="btn btn--ghost btn--sm" onClick={() => download(`/certificates/${c.code}/pdf`, `${c.code}.pdf`).catch((e) => setError(e.message))}>PDF</button>}
                {c.status === 'valid'
                  ? <button className="link" onClick={() => window.confirm(`Revoke certificate ${c.code}? The verification page will show it as revoked.`) && setStatus(c.id, 'revoked')}>Revoke</button>
                  : <button className="link" onClick={() => setStatus(c.id, 'valid')}>Restore</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}

function Webinars() {
  const { data, error, load, setError } = useData('/admin/events');
  const [f, setF] = useState({ title: '', description: '', starts_at: '', duration_min: 60, speaker: 'Core5Campus training team' });
  const [regs, setRegs] = useState(null);
  const add = act(async () => { await api('/admin/events', { method: 'POST', body: f }); setF({ ...f, title: '', description: '', starts_at: '' }); }, load, setError);
  const del = act((id) => api(`/admin/events/${id}`, { method: 'DELETE' }), load, setError);
  const showRegs = (e) => api(`/admin/events/${e.id}/registrations`).then((rows) => setRegs({ title: e.title, rows })).catch((x) => setError(x.message));
  return (
    <>
      <Status error={error} data={data} />
      <ul className="batchlist">{(data || []).map((e) => (
        <li key={e.id}><span><b>{fmtDateTime(e.starts_at)}</b> · {e.title} · {e.registrations} registered</span>
          <span className="btnrow"><button className="link" onClick={() => showRegs(e)}>See registrations</button>
            <button className="link" onClick={() => window.confirm(`Delete "${e.title}" and its registrations?`) && del(e.id)}>Delete</button></span></li>
      ))}</ul>
      {regs && (
        <div className="admincard"><h4>Registered for {regs.title}</h4>
          {regs.rows.length === 0 ? <p className="muted">Nobody has registered yet.</p> : <ul>{regs.rows.map((r) => <li key={r.email}>{r.name}, {r.email}{r.phone ? `, ${r.phone}` : ''}</li>)}</ul>}
        </div>
      )}
      <section className="admincard">
        <h3>Add a webinar</h3>
        <form className="form" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <label>Title<input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <label>Description<textarea rows="2" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
          <div className="form__row">
            <label>Date and time<input type="datetime-local" required value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></label>
            <label>Minutes<input inputMode="numeric" value={f.duration_min} onChange={(e) => setF({ ...f, duration_min: e.target.value })} /></label>
          </div>
          <label>Speaker<input value={f.speaker} onChange={(e) => setF({ ...f, speaker: e.target.value })} /></label>
          <button className="btn btn--primary btn--sm">Add webinar</button>
        </form>
      </section>
    </>
  );
}

// The site sends no email, so a learner who forgets their password asks us, and we pass on a temporary one.
function Learners() {
  const [email, setEmail] = useState('');
  const [s, setS] = useState({ busy: false, error: '', done: null });
  const reset = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Reset the password for ${email.trim()}? Their current password will stop working.`)) return;
    setS({ busy: true, error: '', done: null });
    try { setS({ busy: false, error: '', done: await api('/admin/users/reset-password', { method: 'POST', body: { email } }) }); }
    catch (err) { setS({ busy: false, error: err.message, done: null }); }
  };
  return (
    <>
      <h2>Reset a learner’s password</h2>
      <p className="muted">Only do this when the request comes from the email address on the account. Send the temporary password to that address, and ask the learner to change it from My learning after signing in.</p>
      <form className="form form--inline" onSubmit={reset}>
        <label>Learner’s email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button className="btn btn--primary" disabled={s.busy || !email.trim()}>{s.busy ? 'Resetting…' : 'Set temporary password'}</button>
      </form>
      {s.error && <p className="form__error" role="alert">{s.error}</p>}
      {s.done && <div className="notice notice--ok" role="status"><strong>Temporary password for {s.done.name}</strong><p><code>{s.done.temp_password}</code><br />Send it to {s.done.email}. It is shown only once.</p></div>}
    </>
  );
}

export default function Admin() {
  const [tab, setTab] = useState(0);
  const Panel = [Overview, Enquiries, Enrolments, CoursesAdmin, LessonVideos, Certificates, Webinars, Learners][tab];
  return (
    <main className="wrap section">
      <h1>Admin</h1>
      <div className="tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((t, i) => <button key={t} role="tab" aria-selected={tab === i} className={tab === i ? 'is-active' : ''} onClick={() => setTab(i)}>{t}</button>)}
      </div>
      <div role="tabpanel"><Panel /></div>
    </main>
  );
}
