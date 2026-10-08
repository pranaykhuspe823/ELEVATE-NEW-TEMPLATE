import { Link } from 'react-router-dom';
import { site } from '../site.js';

// Privacy policy and terms, written to match what the site actually does.
// Have a lawyer review both before launch, and update them whenever data handling changes
// (for example when email sending, payments or analytics are added).
const UPDATED = '8 October 2026';
const Mail = () => <a href={`mailto:${site.email}`}>{site.email}</a>;

export function Privacy() {
  return (
    <main className="wrap section narrow legal">
      <h1>Privacy policy</h1>
      <p className="muted">Last updated {UPDATED}</p>
      <p>{site.name} is run by {site.company}, {site.city} (“we”, “us”). This policy explains what personal data we collect through this website, why, and the choices you have. We process personal data in line with India’s Digital Personal Data Protection Act, 2023.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your account:</strong> name, email address, password (stored only in encrypted, hashed form), and, if you give them, phone number and school or college.</li>
        <li><strong>Your learning:</strong> the courses you enrol in, lessons you complete, assessment scores and the certificates issued to you.</li>
        <li><strong>Forms you send us:</strong> enquiry, contact, syllabus-download and notify-me forms collect your name, email and whatever else you enter, such as phone number, role, institution, course of interest and message.</li>
        <li><strong>Webinar registrations:</strong> name, email and, if you give it, phone number.</li>
      </ul>
      <p>We do not use advertising or analytics trackers. Your browser stores a sign-in token on your device so you stay signed in; signing out removes it.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To run your account, save your progress and issue your certificates.</li>
        <li>To answer your enquiries and send you webinar joining details.</li>
        <li>To confirm a certificate is genuine when someone checks its ID on our verification page.</li>
        <li>To keep the site secure and prevent misuse.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>What others can see</h2>
      <p>Anyone who has a certificate ID can open its verification page, which shows the holder’s name, the certificate title, the course, the issue date, CPD hours and whether it is valid. Only share your certificate ID with people you want to see these details.</p>

      <h2>Services we use</h2>
      <ul>
        <li><strong>Google Fonts</strong> supplies the site’s fonts, so your browser connects to Google’s servers when pages load.</li>
        <li><strong>YouTube and Vimeo</strong> host some recorded lesson videos. When you play one, that service may collect data under its own privacy policy.</li>
        <li><strong>Credly</strong>: if we issue your certificate as a Credly digital badge, we share your name, email address and certificate details with Credly so it can deliver the badge.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>We keep your account, progress and certificates while your account is open, so your certificates stay verifiable. Enquiries and webinar registrations are kept for as long as we need them to follow up with you. You can ask us to delete your data at any time.</p>

      <h2>Your rights</h2>
      <p>You can ask us to tell you what personal data we hold about you, correct or update it, or erase it. If we erase your account, your certificates will no longer be verifiable. To make a request, or to raise a complaint, email <Mail /> from the address on your account. We aim to respond within a reasonable time, and if you are not satisfied you can approach the Data Protection Board of India.</p>

      <h2>Children</h2>
      <p>Our courses are for educators and are not intended for anyone under 18.</p>

      <h2>Security</h2>
      <p>We store passwords only in hashed form and limit access to personal data to people who need it to run the service. No system is perfectly secure; if a breach affects your data, we will inform you and the authorities as the law requires.</p>

      <h2>Changes</h2>
      <p>We will update this page if our practices change and show the new date at the top.</p>

      <h2>Contact</h2>
      <p>{site.company}, {site.city}. Email <Mail />.</p>
    </main>
  );
}

export function Terms() {
  return (
    <main className="wrap section narrow legal">
      <h1>Terms of use</h1>
      <p className="muted">Last updated {UPDATED}</p>
      <p>These terms apply when you use {site.name}, run by {site.company}, {site.city}. By creating an account or using the site you agree to them. Please also read our <Link to="/privacy">privacy policy</Link>.</p>

      <h2>Your account</h2>
      <ul>
        <li>Give your real full name. It is printed on your certificates and shown on their verification pages.</li>
        <li>Keep your password private. You are responsible for activity on your account.</li>
        <li>One account per person. Do not share accounts or take assessments for someone else.</li>
      </ul>

      <h2>Courses</h2>
      <p>Courses are free and self-paced. We may update, add or remove lessons, and change or withdraw a course, to keep the content accurate.</p>

      <h2>Certificates</h2>
      <ul>
        <li>A {site.name} certificate is issued by {site.name} when you complete every lesson and pass the course’s final assessment. It is not a degree, diploma or government qualification.</li>
        <li>CPD hours on a certificate reflect the course’s lesson time. Whether an employer, school or board accepts them is their decision.</li>
        <li>We may revoke a certificate obtained by cheating, false details or misuse of the site. Its verification page will then show it as revoked.</li>
      </ul>

      <h2>Google certifications</h2>
      <p>Some courses prepare you for Google for Education exams. Those exams and certifications are run and awarded by Google, under Google’s own terms and fees. We do not guarantee that you will pass any exam, or any job or income outcome. Google, Google Workspace, Google Classroom and Gemini are trademarks of Google LLC.</p>

      <h2>Third-party tools</h2>
      <p>Lessons refer to tools from other companies, such as AI chatbots. Your use of those tools is governed by their terms, and their features and pricing may change. Follow your institution’s policies and never enter students’ personal data into a tool without proper permission.</p>

      <h2>Acceptable use</h2>
      <p>Do not misuse the site: no attempts to break its security, scrape it, overload it, or upload harmful content.</p>

      <h2>Our content</h2>
      <p>Lessons, slides, narration and other course material belong to {site.company}. You may use them for your own learning and in your own teaching. Do not resell or republish them as a course.</p>

      <h2>Liability</h2>
      <p>We work to keep the content accurate, but it is provided for education and is not legal, financial or professional advice. To the extent the law allows, we are not liable for indirect losses arising from use of the site.</p>

      <h2>Ending your account</h2>
      <p>You can ask us to close your account at any time by emailing <Mail />. We may suspend accounts that break these terms.</p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of India, and the courts of Mumbai have jurisdiction.</p>

      <h2>Contact</h2>
      <p>Email <Mail />.</p>
    </main>
  );
}
