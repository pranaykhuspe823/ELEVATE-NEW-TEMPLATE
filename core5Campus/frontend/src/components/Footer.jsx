import { Link } from 'react-router-dom';
import { Logo } from './Header.jsx';
import { useStore } from '../store.jsx';
import { site } from '../site.js';

const Ic = ({ children }) => <svg className="footer__ic" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
const ICONS = {
  phone: <Ic><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z" fill="currentColor" /></Ic>,
  email: <Ic><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 6.5 12 13l8.5-6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /></Ic>,
  place: <Ic><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor" /></Ic>,
  facebook: <Ic><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8.5c0-.3.2-.5.5-.5z" fill="currentColor" /></Ic>,
  linkedin: <Ic><path d="M4 9h4v11H4zM6 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 9h3.8v1.6c.6-1 1.9-1.9 3.7-1.9 3.4 0 4 2.2 4 5.1V20h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V20h-4z" fill="currentColor" /></Ic>,
  instagram: <Ic><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" /></Ic>,
  youtube: <Ic><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" /><path d="M10 9v6l5-3z" fill="var(--brand-deep)" /></Ic>,
};
const SOCIAL = [['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['instagram', 'Instagram'], ['youtube', 'YouTube']];

export default function Footer() {
  const { published } = useStore();
  const social = SOCIAL.filter(([k]) => site.social?.[k]);
  return (
    <footer className="footer">
      <div className="wrap footer__grid">
        <div>
          <Logo light />
          <p className="footer__about">Free, self-paced certification courses that help teachers, faculty and school leaders teach with Google tools and AI.</p>
          <ul className="footer__list">
            <li><Link to="/privacy">Privacy policy</Link></li>
            <li><Link to="/terms">Terms of use</Link></li>
            <li><Link to="/verify">Verify a certificate</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="footer__head">Our courses</h2>
          <ul className="footer__list footer__list--arrow">
            {published.map((c) => <li key={c.slug}><Link to={`/courses/${c.slug}`}>{c.title}</Link></li>)}
          </ul>
        </div>

        <div>
          <h2 className="footer__head">Contact</h2>
          <ul className="footer__list">
            <li className="footer__label">For course enquiries:</li>
            {site.phone && <li><a className="footer__row" href={`tel:${site.phone.replace(/\s/g, '')}`}>{ICONS.phone}{site.phone}</a></li>}
            <li><a className="footer__row" href={`mailto:${site.email}`}>{ICONS.email}{site.email}</a></li>
            <li><span className="footer__row">{ICONS.place}{site.city}</span></li>
          </ul>
        </div>

        <div>
          {social.length > 0 ? (
            <>
              <h2 className="footer__head">Follow us</h2>
              <ul className="footer__list">
                {social.map(([k, label]) => <li key={k}><a className="footer__row" href={site.social[k]} target="_blank" rel="noreferrer">{ICONS[k]}{label}</a></li>)}
              </ul>
            </>
          ) : (
            <>
              <h2 className="footer__head">Explore</h2>
              <ul className="footer__list">
                <li><Link to="/courses">All courses</Link></li>
                <li><Link to="/webinars">Free webinars</Link></li>
                <li><Link to="/contact">Contact us</Link></li>
                <li><Link to="/login">Sign in</Link></li>
              </ul>
            </>
          )}
          <img className="footer__partner" src="/google-for-education-partner.png" alt="Google for Education Partner" width="220" height="61" />
        </div>
      </div>
      <div className="wrap footer__legal">
        <p>© {new Date().getFullYear()} {site.company}. Google, Google Workspace, Google Classroom and Gemini are trademarks of Google LLC. Google certifications are awarded by Google; Core5Campus certificates are awarded by Core5Campus.</p>
      </div>
    </footer>
  );
}
