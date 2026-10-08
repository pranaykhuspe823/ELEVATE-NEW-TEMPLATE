import { BASE } from '../api.js';

// Same layout as the PDF certificate: white card, name top left, partner-badge box top right, accent band bottom left,
// centred title, "Issued to", name, course badge, issue details and verification link.
export default function CertificatePreview({ name, title = 'Core5Campus Certified Digital Educator', slug = 'google-certified-educator', code = 'C5C-GCE-26-7K2M9Q', date, cpd }) {
  const shown = (name || '').trim() || 'Your name here';
  const issued = (date ? new Date(date) : new Date())
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  return (
    <figure className="cc" aria-label={`Certificate: ${title}, issued to ${shown}`}>
      <div className="cc__band" aria-hidden="true" />
      <div className="cc__card">
        <p className="cc__logo">Core5<span>Campus</span></p>
        <img className="cc__partner" src="/google-for-education-partner.png" alt="Google for Education Partner" />
        <p className="cc__title">{title}</p>
        <p className="cc__label">ISSUED TO</p>
        <p className={`cc__name ${name ? '' : 'cc__name--empty'}`}>{shown}</p>
        <img className="cc__badge" src={`${BASE}/badges/${slug}.svg?v=5`} alt="" />
        <p className="cc__meta">Issued on: {issued} &nbsp;|&nbsp; Issued by: Core5Campus{cpd ? ` | ${cpd} CPD hours` : ''}</p>
        <p className="cc__meta cc__meta--muted">Verify: {location.origin}/verify/{code}</p>
      </div>
    </figure>
  );
}
