import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HeroBadges from '../components/HeroBadges.jsx';
import LeadForm from '../components/LeadForm.jsx';
import CourseCard from '../components/CourseCard.jsx';
import { api } from '../api.js';
import { useStore } from '../store.jsx';
import { CATEGORY_INFO, fmtDateTime, site } from '../site.js';

export default function Home() {
  const { catalog } = useStore();
  const [code, setCode] = useState('');
  const [events, setEvents] = useState([]);
  const nav = useNavigate();
  const tech = catalog.categories.find((c) => c.slug === 'technology-ai');

  useEffect(() => { api('/events').then(setEvents).catch(() => {}); }, []);

  return (
    <main>
      <header className="hero hero--home">
        <div className="wrap hero__grid">
          <div className="hero__inner">
            <p className="eyebrow">Certification for teachers · CPD hours for your NEP 2020 goal</p>
            <h1>Teach with Google tools and AI. <em>Get certified for it.</em></h1>
            <p className="hero__lead">Self-paced online courses for teachers, faculty and school leaders. Learn at your own pace, pass the assessment, and earn a Core5Campus certificate with a unique ID that anyone can check online.</p>
            <div className="btnrow">
              <Link className="btn btn--primary" to="/courses">Browse courses</Link>
              <Link className="btn btn--secondary" to="/verify">Verify a certificate</Link>
            </div>
            <img className="hero__partner" src="/google-for-education-partner.png" alt="Google for Education Partner" width="230" height="64" />
          </div>
          <HeroBadges courses={tech?.courses || []} />
        </div>
      </header>

      {catalog.error && <div className="wrap"><p className="form__error">{catalog.error} <button className="link" onClick={() => location.reload()}>Reload</button></p></div>}

        {tech && (
          <section className="zone zone--white"><div className="wrap">
            <div className="section__head">
              <div>
                <p className="eyebrow">Our courses · {tech.courses.length} self-paced programmes</p>
                <h2>Certification courses for educators</h2>
                <p>Google Workspace, classroom AI, teacher training, school leadership and online teaching. Learn at your own pace and finish with a Core5Campus certificate that anyone can check online.</p>
              </div>
              <Link className="btn btn--secondary btn--sm" to="/courses">View all courses →</Link>
            </div>
            <div className="cards">
              {tech.courses.map((c) => <CourseCard key={c.slug} course={c} category={tech.slug} swatch={CATEGORY_INFO[tech.slug]?.swatch || 'green'} />)}
            </div>
          </div></section>
        )}

        <section className="zone zone--green"><div className="wrap">
          <div className="section__head"><div><p className="eyebrow">How it works</p><h2>Four steps to your certificate</h2></div></div>
          <ol className="steps">
            <li><h3>Enrol in a course</h3><p>Sign up and start straight away. There are no fixed dates; learn at your own pace on any device.</p></li>
            <li><h3>Work through the lessons</h3><p>Narrated slide lessons, notes, a classroom task and a quick check in every lesson.</p></li>
            <li><h3>Pass the assessment</h3><p>Complete every lesson, then take the final assessment from your course page.</p></li>
            <li><h3>Download your certificate</h3><p>It carries a unique ID and QR code. Anyone can confirm it on our verification page.</p></li>
          </ol>
          <p className="muted small steps__note">Every course gives you a <strong>Core5Campus certificate</strong> with CPD hours. Courses built around a Google certification also prepare you for that <strong>Google exam</strong>, which Google awards. NEP 2020 expects {site.cpdGoal} CPD hours a year; your dashboard adds them up.</p>
        </div></section>

        {events.length > 0 && (
          <section className="zone zone--cream"><div className="wrap">
            <div className="section__head">
              <div><p className="eyebrow">Free webinars</p><h2>See how we teach</h2><p>One hour, live, no fee.</p></div>
              <Link className="btn btn--secondary btn--sm" to="/webinars">All webinars →</Link>
            </div>
            <div className="cards">
              {events.slice(0, 3).map((e) => (
                <Link key={e.id} to="/webinars" className="card">
                  <div className="card__top"><span className="card__kicker card__kicker--date">{fmtDateTime(e.starts_at)}</span></div>
                  <div className="card__body"><h3>{e.title}</h3><p>{e.description}</p></div>
                  <div className="card__meta"><span className="pill">Free</span><strong>Reserve a seat →</strong></div>
                </Link>
              ))}
            </div>
          </div></section>
        )}

        <section className="zone zone--white"><div className="wrap two">
          <div>
            <p className="eyebrow">Verify</p>
            <h2>Check a certificate</h2>
            <p>Been shown a Core5Campus certificate? Enter the ID printed on it to confirm it is genuine. Every certificate also carries a QR code that opens the same check.</p>
          </div>
          <form className="panel" onSubmit={(e) => { e.preventDefault(); if (code.trim()) nav(`/verify/${code.trim().toUpperCase()}`); }}>
            <label>Certificate ID<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="C5C-GCE-26-XXXXXX" /></label>
            <button className="btn btn--secondary">Verify certificate</button>
          </form>
        </div></section>

        <section className="zone zone--green" id="enquire"><div className="wrap two">
          <div>
            <p className="eyebrow">Talk to us</p>
            <h2>Not sure which course fits?</h2>
            <p>Tell us what you teach and what you want to get better at. We will suggest the right course and answer questions about certification.</p>
            <p><a href={`mailto:${site.email}`}>{site.email}</a>{site.phone && <><br /><a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a></>}</p>
          </div>
          <LeadForm />
        </div></section>
    </main>
  );
}
