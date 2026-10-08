import { useSearchParams } from 'react-router-dom';
import CourseCard from '../components/CourseCard.jsx';
import { useStore } from '../store.jsx';
import { CATEGORY_INFO } from '../site.js';

const matches = (c, q) => !q || [c.title, c.tagline, c.short].join(' ').toLowerCase().includes(q.toLowerCase());

export default function Courses() {
  const { catalog } = useStore();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const setQ = (value) => setParams(value ? { q: value } : {}, { replace: true });

  const list = catalog.categories.flatMap((cat) => cat.courses.filter((c) => matches(c, q)).map((c) => ({ c, cat: cat.slug })));

  return (
    <main>
      <header className="hero hero--sm">
        <div className="wrap hero__inner">
          <p className="eyebrow">Technology and AI</p>
          <h1>All courses</h1>
          <p className="hero__lead">Self-paced certification courses for teachers, faculty and school leaders.</p>
        </div>
      </header>

      <section className="zone zone--white"><div className="wrap stack stack--flush">
        <div className="filters">
          <label className="filters__search"><span className="sr">Search courses</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses" />
          </label>
        </div>

        {!catalog.loaded && <p className="muted">Loading courses…</p>}
        {catalog.error && <p className="form__error">{catalog.error}</p>}
        {catalog.loaded && !catalog.error && list.length === 0 && (
          <div className="empty"><p>No courses match “{q}”. <button className="link" onClick={() => setQ('')}>Clear search</button></p></div>
        )}

        {list.length > 0 && (
          <div className="cards">
            {list.map(({ c, cat }) => <CourseCard key={c.slug} course={c} category={cat} swatch={CATEGORY_INFO[cat]?.swatch || 'green'} />)}
          </div>
        )}
      </div></section>
    </main>
  );
}
