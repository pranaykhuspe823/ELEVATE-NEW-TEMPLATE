import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";

interface FooterLink {
  label: string;
  to?: string;
  href?: string;
}

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Students",
    links: [
      { label: "How it works", href: "/#how" },
      { label: "Analyze my resume", to: "/upload" },
      { label: "My assignments", to: "/assignments" },
    ],
  },
  {
    title: "Faculty",
    links: [{ label: "Faculty login", to: "/faculty" }],
  },
  {
    title: "Colleges",
    links: [
      { label: "Register your college", to: "/college/register" },
      { label: "TPO login", to: "/college" },
    ],
  },
];

const linkClass = "text-sm text-white/75 hover:text-white transition-colors";

function CopyrightBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-[#07111f] border-t border-white/10 py-2">
      <div className="max-w-[min(1320px,94vw)] mx-auto px-5 sm:px-8 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-white">
          © {new Date().getFullYear()} Elevate · Core5. All rights reserved.
        </p>
        <p className="hidden sm:block font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
          Assess · Advise · Learn · Elevate
        </p>
      </div>
    </div>
  );
}

/** `compact` renders only the slim fixed copyright bar (used for signed-in
 * app screens, where a full footer would just eat space). Otherwise the full
 * footer -- brand, description and link columns -- sits above the bar. */
export default function SiteFooter({ compact = false }: { compact?: boolean }) {
  if (compact) return <CopyrightBar />;

  return (
    <footer className="bg-[#07111f] text-white border-t border-white/10">
      <div className="max-w-[min(1320px,94vw)] mx-auto px-5 sm:px-8 pt-14 pb-[76px]">
        <div className="grid gap-10 md:grid-cols-[280px_minmax(0,1fr)] md:gap-16 pb-12 border-b border-white/10">
          <div className="flex flex-col gap-4">
            <Link
              to="/"
              aria-label="Elevate Core5 home"
              className="self-start rounded-xl bg-white px-3.5 py-2.5"
            >
              <BrandLogo className="h-9" />
            </Link>
            <p className="text-[13.5px] leading-[1.7] text-white/70">
              Elevate by Core5 — resume intelligence for students, faculty and
              placement cells. Get a real ATS score, a skill test built from
              your own resume, and a plan to close the gaps.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#E5B94E] mb-4">
                  {col.title}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.to ? (
                        <Link to={l.to} className={linkClass}>
                          {l.label}
                        </Link>
                      ) : (
                        <a href={l.href} className={linkClass}>
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
      </div>
      <CopyrightBar />
    </footer>
  );
}
