import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';

export function Logo({ light }) {
  return (
    <Link to="/" className="logo" aria-label="Core5Campus home">
      <span className="logo__word">Core5<span>Campus</span></span>
    </Link>
  );
}

const Chevron = () => <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;

export default function Header() {
  const { catalog, user, logout } = useStore();
  const [open, setOpen] = useState(false);       // Browse menu
  const [mobile, setMobile] = useState(false);   // mobile drawer
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const loc = useLocation();
  const nav = useNavigate();
  const courses = catalog.categories.flatMap((c) => c.courses);

  useEffect(() => { setOpen(false); setMobile(false); }, [loc.pathname, loc.search]);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, []);

  const search = (e) => {
    e.preventDefault();
    nav(q.trim() ? `/courses?q=${encodeURIComponent(q.trim())}` : '/courses');
  };

  return (
    <header className="header">
      <div className="wrap header__bar">
        <Logo />
        <button className="header__burger" aria-expanded={mobile} aria-controls="site-nav" onClick={() => setMobile(!mobile)}>
          <span className="sr">Menu</span><i /><i /><i />
        </button>
        <nav id="site-nav" className={`nav ${mobile ? 'nav--open' : ''}`} aria-label="Main">
          <div className="nav__main">
            <div className="nav__browse" ref={ref}>
              <button className="nav__link" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
                Courses <Chevron />
              </button>
              {open && (
                <div className="mega">
                  <ul className="mega__courses">
                    {courses.map((c) => (
                      <li key={c.slug}>
                        <Link to={`/courses/${c.slug}`}>
                          <strong>{c.title}</strong>
                          <span>{c.status === 'upcoming' ? 'Coming soon' : c.short}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <ul className="mega__more">
                    <li><Link to="/courses">See all courses →</Link></li>
                  </ul>
                </div>
              )}
            </div>
            <NavLink className="nav__link" to="/webinars">Webinars</NavLink>
            <NavLink className="nav__link" to="/verify">Verify</NavLink>
          </div>
          <div className="nav__side">
            <form className="search" role="search" onSubmit={search}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              <label className="sr" htmlFor="site-search">Search courses</label>
              <input id="site-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses" />
            </form>
            {user ? (
              <>
                <NavLink className="nav__link" to={user.role === 'admin' ? '/admin' : '/dashboard'}>{user.role === 'admin' ? 'Admin' : 'My learning'}</NavLink>
                <button className="btn btn--secondary btn--sm" onClick={logout}>Sign out</button>
              </>
            ) : (
              <Link className="btn btn--primary btn--sm" to="/login">Sign in</Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
