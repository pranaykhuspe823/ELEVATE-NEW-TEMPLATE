import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Courses from './pages/Courses.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import Events from './pages/Events.jsx';
import Verify from './pages/Verify.jsx';
import Contact from './pages/Contact.jsx';
import { Privacy, Terms } from './pages/Legal.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Learn from './pages/Learn.jsx';
import Lesson from './pages/Lesson.jsx';
import Admin from './pages/Admin.jsx';
import { useStore } from './store.jsx';

function Guard({ children, admin }) {
  const { user, ready } = useStore();
  const loc = useLocation();
  if (!ready) return <main className="wrap section"><p className="muted">Loading…</p></main>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <div id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/schools" element={<Navigate to="/" replace />} />
          <Route path="/webinars" element={<Events />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:code" element={<Verify />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
          <Route path="/learn/:id" element={<Guard><Learn /></Guard>} />
          <Route path="/learn/:id/:m/:l" element={<Guard><Lesson /></Guard>} />
          <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
          <Route path="*" element={<main className="wrap section"><h1>Page not found</h1><p>The link may be old. <a href="/courses">Browse all courses</a>.</p></main>} />
        </Routes>
      </div>
      <Footer />
    </>
  );
}
