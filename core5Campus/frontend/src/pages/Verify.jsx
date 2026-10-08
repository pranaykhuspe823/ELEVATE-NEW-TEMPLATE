import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, downloadBadge } from '../api.js';
import CertificatePreview from '../components/CertificatePreview.jsx';
import { fmtDate } from '../site.js';

export default function Verify() {
  const { code } = useParams();
  const nav = useNavigate();
  const [input, setInput] = useState(code || '');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRes(null); setInput(code || '');
    if (!code) return;
    setBusy(true);
    api(`/certificates/verify/${encodeURIComponent(code)}`).then(setRes).catch((e) => setRes({ found: false, error: e.message })).finally(() => setBusy(false));
  }, [code]);

  return (
    <main className="wrap section verify">
      <h1>Verify a certificate</h1>
      <p className="lead">Enter the certificate ID printed on a Core5Campus certificate, or scan its QR code.</p>
      <form className="form form--inline" onSubmit={(e) => { e.preventDefault(); if (input.trim()) nav(`/verify/${input.trim().toUpperCase()}`); }}>
        <label>Certificate ID<input value={input} onChange={(e) => setInput(e.target.value)} placeholder="C5C-GCE-26-XXXXXX" autoCapitalize="characters" /></label>
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Checking…' : 'Verify certificate'}</button>
      </form>
      <div aria-live="polite">
        {res && !res.found && <div className="notice notice--bad"><strong>Certificate not found</strong><p>{res.error}</p></div>}
        {res?.found && res.status === 'revoked' && <div className="notice notice--bad"><strong>This certificate has been revoked</strong><p>ID {res.code} is no longer valid. Contact Core5Campus if you think this is a mistake.</p></div>}
        {res?.found && res.status === 'valid' && (
          <div className="result">
            <p className="result__ok">Valid certificate</p>
            <div className="result__cert">
              <CertificatePreview name={res.holder_name} title={res.cert_title} slug={res.slug} code={res.code} cpd={res.cpd_hours} date={res.issued_at.replace(' ', 'T') + 'Z'} />
            </div>
            <h2>{res.holder_name}</h2>
            <dl>
              <div><dt>Certificate</dt><dd>{res.cert_title}</dd></div>
              <div><dt>Course</dt><dd>{res.course_title}</dd></div>
              <div><dt>Issued on</dt><dd>{fmtDate(res.issued_at.replace(' ', 'T') + 'Z', { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
              {res.cpd_hours && <div><dt>CPD hours</dt><dd>{res.cpd_hours}</dd></div>}
              <div><dt>Certificate ID</dt><dd>{res.code}</dd></div>
            </dl>
            <button className="btn btn--ghost btn--sm result__badge" onClick={() => downloadBadge(res.slug, `${res.code}-badge.png`)}>Download badge</button>
          </div>
        )}
      </div>
    </main>
  );
}
