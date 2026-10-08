import { Link } from 'react-router-dom';
import { fmtHours } from '../site.js';

// Small line icons, one per catalogue category.
const ICONS = {
  'technology-ai': <><path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z" /><path d="M19 16c.2 1.5.9 2.2 2.4 2.4-1.5.2-2.2.9-2.4 2.4-.2-1.5-.9-2.2-2.4-2.4 1.5-.2 2.2-.9 2.4-2.4z" /></>,
};

export function Icon({ category, swatch }) {
  return (
    <span className={`icon swatch-${swatch}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[category] || ICONS['technology-ai']}
      </svg>
    </span>
  );
}

export default function CourseCard({ course, category, swatch }) {
  const live = course.status === 'published';
  return (
    <Link to={`/courses/${course.slug}`} className="card">
      <div className="card__top">
        <Icon category={category} swatch={swatch} />
        <span className="card__kicker">{live ? course.short : ''}</span>
        {!live && <span className="tag">Coming soon</span>}
      </div>
      <div className="card__body">
        <h3>{course.title}</h3>
        <p>{course.tagline}</p>
      </div>
      {live && (
        <div className="card__meta">
          <span className="pill">{course.lesson_count} lessons</span>
          <span className="pill">{fmtHours(course.total_minutes)}</span>
          <strong>Self-paced · Certificate</strong>
        </div>
      )}
    </Link>
  );
}
