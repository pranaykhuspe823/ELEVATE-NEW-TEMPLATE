import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { site } from '../site.js';

export default function Login() {
  const { user, login, register } = useStore();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [isNew, setIsNew] = useState(false);
  const [f, setF] = useState({ name: '', email: '', phone: '', institution: '', password: '' });
  const [s, setS] = useState({ busy: false, error: '' });
  const [forgot, setForgot] = useState(false);
  const next = params.get('next');
  const dest = (u) => (next && next.startsWith('/') && !next.startsWith('//') ? next : u.role === 'admin' ? '/admin' : '/dashboard');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (user) return <Navigate to={dest(user)} replace />;

  const submit = async (e) => {
    e.preventDefault(); setS({ busy: true, error: '' });
    try { const u = await (isNew ? register(f) : login({ email: f.email, password: f.password })); nav(dest(u), { replace: true }); }
    catch (err) { setS({ busy: false, error: err.message }); }
  };

  return (
    <main className="wrap section narrow">
      <h1>{isNew ? 'Create your account' : 'Sign in'}</h1>
      <p className="lead">{isNew ? 'Use the name you want printed on your certificates.' : 'Open your courses, progress and certificates.'}</p>
      <form className="form" onSubmit={submit} noValidate>
        {isNew && <label>Full name<input value={f.name} onChange={set('name')} autoComplete="name" /></label>}
        <label>Email<input type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
        {isNew && (
          <div className="form__row">
            <label>Phone (optional)<input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></label>
            <label>School or college (optional)<input value={f.institution} onChange={set('institution')} autoComplete="organization" /></label>
          </div>
        )}
        <label>Password{isNew && <small> at least 8 characters</small>}<input type="password" value={f.password} onChange={set('password')} autoComplete={isNew ? 'new-password' : 'current-password'} /></label>
        {s.error && <p className="form__error" role="alert">{s.error}</p>}
        {isNew && <p className="muted small">By creating an account you agree to our <Link to="/terms">terms of use</Link> and <Link to="/privacy">privacy policy</Link>.</p>}
        <button className="btn btn--primary" disabled={s.busy}>{s.busy ? 'Please wait…' : isNew ? 'Create account' : 'Sign in'}</button>
      </form>
      {!isNew && (forgot
        ? <div className="notice" role="status"><strong>Forgot your password?</strong><p>Email <a href={`mailto:${site.email}?subject=Password%20reset`}>{site.email}</a> from the address you signed up with. We will send you a temporary password, which you can change after signing in.</p></div>
        : <p><button className="link" onClick={() => setForgot(true)}>Forgot your password?</button></p>)}
      <p>{isNew ? 'Already have an account?' : 'New to Core5Campus?'} <button className="link" onClick={() => { setIsNew(!isNew); setS({ busy: false, error: '' }); }}>{isNew ? 'Sign in' : 'Create an account'}</button></p>
    </main>
  );
}
