import LeadForm from '../components/LeadForm.jsx';
import { site } from '../site.js';

export default function Contact() {
  return (
    <main className="wrap section two">
      <div>
        <h1>Contact us</h1>
        <p className="lead">Questions about a course or your certificate.</p>
        <dl className="contact">
          <div><dt>Email</dt><dd><a href={`mailto:${site.email}`}>{site.email}</a></dd></div>
          {site.phone && <div><dt>Phone and WhatsApp</dt><dd><a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a></dd></div>}
          <div><dt>Office</dt><dd>{site.company}<br />{site.city}</dd></div>
        </dl>
      </div>
      <LeadForm type="contact" cta="Send message" doneTitle="Message sent" doneText="Thank you. We will reply by email." />
    </main>
  );
}
