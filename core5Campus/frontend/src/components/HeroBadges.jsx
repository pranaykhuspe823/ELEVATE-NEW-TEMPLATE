import { Link } from 'react-router-dom';
import { BASE } from '../api.js';

// Hero illustration: the course badges arranged around a graduation cap, on a gold orbit,
// with floating spheres and sparkles. Badges are the real course badges (the same SVGs learners download).
// r = tilt in the picture plane; rx/ry = 3D tilt towards the viewer
const SPOTS = [
  { x: 6, y: 3, r: -12, rx: 8, ry: 18, d: 0 },      // top left
  { x: 55, y: 0, r: 11, rx: 8, ry: -16, d: 1.2 },   // top right
  { x: 2, y: 47, r: -14, rx: -6, ry: 20, d: 0.6 },  // bottom left
  { x: 71, y: 37, r: 17, rx: -4, ry: -22, d: 2.4 }, // right
  { x: 40, y: 58, r: 4, rx: -10, ry: 6, d: 1.8 },   // bottom centre
];
// Out-of-focus badges in the background, for depth
const GHOSTS = [{ x: 30, y: -6, s: 11, r: 14 }, { x: 88, y: 18, s: 10, r: -10 }, { x: -6, y: 28, s: 10, r: 8 }, { x: 84, y: 74, s: 13, r: 16 }, { x: 12, y: 84, s: 12, r: -18 }];
const SPHERES = [
  { x: 1, y: 30, s: 5.5, gold: true }, { x: 92, y: 14, s: 3, gold: false }, { x: 49, y: 11, s: 3.4, gold: true },
  { x: 32, y: 54, s: 5, gold: false }, { x: 95, y: 72, s: 4.5, gold: true }, { x: 87, y: 66, s: 2.8, gold: false },
  { x: 28, y: 90, s: 4, gold: true }, { x: 34, y: 3, s: 2.6, gold: false }, { x: 66, y: 93, s: 2.4, gold: false },
  { x: 33, y: 74, s: 2.6, pearl: true }, { x: 30, y: 48, s: 1.8, pearl: true }, { x: 63, y: 30, s: 2, pearl: true },
];
const SPARKS = [{ x: 22, y: 39, s: 3 }, { x: 48, y: 34, s: 2.2 }, { x: 89, y: 47, s: 2.6 }, { x: 0, y: 66, s: 3.4 }, { x: 64, y: 50, s: 2 }, { x: 86, y: 86, s: 2.4 }];

const Spark = ({ style }) => (
  <svg className="hb__spark" style={style} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12C7 11 11 7 12 0z" /></svg>
);

function Cap() {
  return (
    <svg className="hb__cap" viewBox="0 0 220 170" aria-hidden="true">
      <defs>
        <linearGradient id="hbBoard" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1f5a43" /><stop offset="1" stopColor="#0b2a1f" /></linearGradient>
        <linearGradient id="hbBase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#174634" /><stop offset="1" stopColor="#081f17" /></linearGradient>
        <linearGradient id="hbGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset=".5" stopColor="#f5b301" /><stop offset="1" stopColor="#b97f00" /></linearGradient>
      </defs>
      <path d="M56 78 v40 c0 18 108 18 108 0 v-40" fill="url(#hbBase)" />
      <path d="M56 112 c0 16 108 16 108 0" fill="none" stroke="url(#hbGold)" strokeWidth="6" />
      <path d="M110 22 L208 64 L110 106 L12 64 Z" fill="url(#hbBoard)" />
      <path d="M110 22 L208 64 L110 106 L12 64 Z" fill="none" stroke="#2e7a5c" strokeWidth="2" opacity=".6" />
      <path d="M110 64 L176 88 L178 126" fill="none" stroke="url(#hbGold)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="110" cy="64" r="7" fill="url(#hbGold)" />
      <path d="M170 124 h16 l4 34 c-6 6-18 6-24 0 z" fill="url(#hbGold)" />
    </svg>
  );
}

export default function HeroBadges({ courses }) {
  const list = courses.filter((c) => c.status === 'published').slice(0, SPOTS.length);
  return (
    <div className="hb" role="img" aria-label={`Course badges: ${list.map((c) => c.title).join(', ')}`}>
      <div className="hb__glow" aria-hidden="true" />
      {list.length > 0 && GHOSTS.map((g, i) => (
        <img key={i} className="hb__ghost" src={`${BASE}/badges/${list[i % list.length].slug}.svg?v=5`} alt="" aria-hidden="true"
          style={{ left: `${g.x}%`, top: `${g.y}%`, width: `${g.s}%`, transform: `rotate(${g.r}deg)` }} />
      ))}
      <svg className="hb__orbit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="hbRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".3" stopColor="#f5b301" /><stop offset=".65" stopColor="#b97f00" /><stop offset="1" stopColor="#ffd24d" /></linearGradient></defs>
        <ellipse cx="50" cy="52" rx="47" ry="22" transform="rotate(-14 50 52)" className="hb__orbit--main" />
        <ellipse cx="50" cy="52" rx="40" ry="31" transform="rotate(22 50 52)" className="hb__orbit--thin" />
      </svg>
      {SPHERES.map((p, i) => (
        <span key={i} className={`hb__sphere ${p.gold ? 'hb__sphere--gold' : ''} ${p.pearl ? 'hb__sphere--pearl' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.s}%`, animationDelay: `${i * 0.7}s` }} aria-hidden="true" />
      ))}
      {SPARKS.map((p, i) => <Spark key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.s}%`, animationDelay: `${i * 0.5}s` }} />)}
      <span className="hb__capshadow" aria-hidden="true" />
      <Cap />
      {list.map((c, i) => {
        const s = SPOTS[i];
        return (
          <Link key={c.slug} to={`/courses/${c.slug}`} className="hb__badge" title={c.title}
            style={{ left: `${s.x}%`, top: `${s.y}%`, '--r': `${s.r}deg`, '--rx': `${s.rx}deg`, '--ry': `${s.ry}deg`, animationDelay: `${s.d}s` }}>
            <img src={`${BASE}/badges/${c.slug}.svg?v=5`} alt="" draggable="false" />
          </Link>
        );
      })}
    </div>
  );
}
