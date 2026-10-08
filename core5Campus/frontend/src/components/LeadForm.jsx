import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useStore } from '../store.jsx';
import { ROLES } from '../site.js';

// One form for every kind of lead: enquiry, syllabus download, notify-me.
export default function LeadForm({ type = 'enquiry', courseSlug = '', lockCourse = false, cta = 'Send enquiry', school = false, compact = false,
  doneTitle = 'Enquiry sent', doneText = 'Thank you. Our team will get back to you by email or phone.', onDone }) {
  const { published, user } = useStore();
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', role: '', institution: user?.institution || '',
    course_slug: courseSlug, message: '', website: '', teachers: '', city: '' });
  const [state, setState] = useState({ busy: false, error: '', done: false });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, error: '', done: false });
    try {
      const { teachers, city, ...rest } = f;
      await api('/enquiries', { method: 'POST', body: { ...rest, type, meta: school ? { teachers, city } : undefined } });
      setState({ busy: false, error: '', done: true });
      onDone?.(f);
    } catch (err) { setState({ busy: false, error: err.message, done: false }); }
  }

  if (state.done) return <div className="notice notice--ok" role="status"><strong>{doneTitle}</strong><p>{doneText}</p></div>;

  return (
    <form className={`form ${compact ? 'form--compact' : ''}`} onSubmit={submit} noValidate>
      <div className="form__row">
        <label>Full name<input required value={f.name} onChange={set('name')} autoComplete="name" /></label>
        <label>Email<input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
      </div>
      <div className="form__row">
        <label>Phone or WhatsApp<input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="+91" /></label>
        <label>You are a<select value={f.role} onChange={set('role')}><option value="">Select</option>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
      </div>
      {!compact && (
        <div className="form__row">
          <label>{school ? 'School or college name' : 'School or college (optional)'}<input value={f.institution} onChange={set('institution')} autoComplete="organization" /></label>
          {school ? <label>City<input value={f.city} onChange={set('city')} /></label> : !lockCourse && (
            <label>Course<select value={f.course_slug} onChange={set('course_slug')}><option value="">Not sure yet</option>{published.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label>
          )}
        </div>
      )}
      {school && (
        <div className="form__row">
          <label>Number of teachers<input inputMode="numeric" value={f.teachers} onChange={set('teachers')} placeholder="e.g. 40" /></label>
          <label>Programme<select value={f.course_slug} onChange={set('course_slug')}><option value="">Help us choose</option>{published.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label>
        </div>
      )}
      {!compact && <label>Anything we should know? (optional)<textarea rows="3" value={f.message} onChange={set('message')} /></label>}
      <label className="form__hp" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={f.website} onChange={set('website')} /></label>
      {state.error && <p className="form__error" role="alert">{state.error}</p>}
      <p className="muted small">We use these details only to respond to your request. See our <Link to="/privacy">privacy policy</Link>.</p>
      <button className="btn btn--primary" disabled={state.busy}>{state.busy ? 'Sending…' : cta}</button>
    </form>
  );
}
