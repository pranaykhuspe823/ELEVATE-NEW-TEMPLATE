import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useStore } from '../store.jsx';
import { fmtDateTime } from '../site.js';

function Register({ event }) {
  const { user } = useStore();
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [s, setS] = useState({ busy: false, error: '', done: false });
  const submit = async (e) => {
    e.preventDefault(); setS({ busy: true, error: '', done: false });
    try { await api(`/events/${event.id}/register`, { method: 'POST', body: f }); setS({ busy: false, error: '', done: true }); }
    catch (err) { setS({ busy: false, error: err.message, done: false }); }
  };
  if (s.done) return <div className="notice notice--ok" role="status"><strong>Seat reserved</strong><p>We will email the joining link to {f.email} before the session.</p></div>;
  return (
    <form className="form form--inline" onSubmit={submit} noValidate>
      <label>Full name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></label>
      <label>Email<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></label>
      <label>Phone (optional)<input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></label>
      <p className="muted small">We use these details only for this webinar. See our <Link to="/privacy">privacy policy</Link>.</p>
      <button className="btn btn--primary" disabled={s.busy}>{s.busy ? 'Reserving…' : 'Reserve a seat'}</button>
      {s.error && <p className="form__error" role="alert">{s.error}</p>}
    </form>
  );
}

export default function Events() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => { api('/events').then(setEvents).catch((e) => setError(e.message)); }, []);
  return (
    <main className="wrap section">
      <h1>Free webinars</h1>
      <p className="lead">Live sessions with Core5Campus trainers. Free to attend, with time for questions.</p>
      {error && <p className="form__error">{error}</p>}
      {events && events.length === 0 && <p>No webinars are scheduled right now. Check back soon, or <a href="/contact">ask us to run one for your school</a>.</p>}
      <ul className="events events--full">
        {(events || []).map((e) => (
          <li key={e.id}>
            <time>{fmtDateTime(e.starts_at)}<small>{e.duration_min} min · online</small></time>
            <div><h2>{e.title}</h2><p>{e.description}</p><p className="muted">With {e.speaker}</p>
              {open === e.id && <Register event={e} />}
            </div>
            {open !== e.id && <button className="btn btn--ghost btn--sm" onClick={() => setOpen(e.id)}>Reserve a seat</button>}
          </li>
        ))}
      </ul>
    </main>
  );
}
