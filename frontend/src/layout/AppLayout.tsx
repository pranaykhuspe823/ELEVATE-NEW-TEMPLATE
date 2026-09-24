import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth, type AuthUser } from "../lib/auth";
import { Avatar } from "../components/faculty/ui";
import BrandLogo from "../components/BrandLogo";
import SiteFooter from "../components/SiteFooter";
import { ChevronDownIcon, LogOutIcon, UserIcon } from "../components/faculty/icons";

interface NavItem {
  to: string;
  label: string;
}

const NAV_BY_ROLE: Record<AuthUser["role"], NavItem[]> = {
  STUDENT: [
    { to: "/upload", label: "Upload resume" },
    { to: "/assignments", label: "My assignments" },
    { to: "/drives", label: "Campus drives" },
  ],
  FACULTY: [
    { to: "/faculty", label: "Faculty dashboard" },
    { to: "/drives", label: "Campus drives" },
  ],
  COLLEGE_ADMIN: [
    { to: "/college", label: "College dashboard" },
    { to: "/drives", label: "Campus drives" },
  ],
};

const ROLE_LABEL: Record<AuthUser["role"], string> = {
  STUDENT: "Student",
  FACULTY: "Faculty",
  COLLEGE_ADMIN: "College admin",
};

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-full px-3.5 py-2 text-sm transition-colors ${
    isActive
      ? "bg-lime/10 text-lime font-medium"
      : "text-text-2 hover:text-text hover:bg-card-2/70"
  }`;
}

function Logo() {
  return (
    <Link to="/" aria-label="Elevate home" className="flex-none block">
      <BrandLogo />
    </Link>
  );
}

function UserMenu({ user, items }: { user: AuthUser; items: NavItem[] }) {
  const { logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayName = user.name ?? user.email;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-2 sm:pr-3 transition-colors ${
          open
            ? "border-lime/40 bg-white"
            : "border-border-strong bg-white/70 hover:bg-white"
        }`}
      >
        <Avatar
          name={user.name}
          email={user.email}
          url={user.avatarUrl}
          size={32}
        />
        <span className="hidden md:block max-w-[150px] truncate text-sm font-medium">
          {displayName}
        </span>
        <ChevronDownIcon
          width={14}
          height={14}
          className={`text-text-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[268px] rounded-2xl border border-border bg-white p-2 shadow-[0_18px_40px_-18px_rgba(31,41,55,0.35)]"
        >
          <div className="px-3 pt-2 pb-3 border-b border-border">
            <p className="text-sm font-medium truncate">{displayName}</p>
            {user.name && (
              <p className="text-text-2 text-xs truncate mt-0.5">{user.email}</p>
            )}
            <span className="inline-block mt-2 rounded-full bg-lime/10 text-lime px-2.5 py-0.5 text-[11px] font-medium">
              {ROLE_LABEL[user.role]}
            </span>
          </div>

          <div className="py-1.5 border-b border-border">
            <NavLink
              to="/profile"
              role="menuitem"
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ${
                  isActive
                    ? "bg-lime/10 text-lime font-medium"
                    : "text-text hover:bg-card-2/70"
                }`
              }
            >
              <UserIcon width={16} height={16} />
              My profile
            </NavLink>
          </div>

          <div className="sm:hidden py-1.5 border-b border-border">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                role="menuitem"
                className={({ isActive }) =>
                  `block rounded-xl px-3 py-2.5 text-sm ${
                    isActive
                      ? "bg-lime/10 text-lime font-medium"
                      : "text-text hover:bg-card-2/70"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => void logout()}
            className="mt-1.5 w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-text-2 hover:bg-coral/10 hover:text-coral transition-colors"
          >
            <LogOutIcon width={16} height={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // /faculty and everything under /college have their own login/register
    // gates (separate email/password credentials from student Google
    // sign-in), so they're reachable signed-out -- everything else still
    // bounces to the landing page.
    const hasOwnGate = location.pathname === "/faculty" || location.pathname.startsWith("/college");
    if (!loading && !user && !hasOwnGate) {
      navigate("/", { replace: true });
    }
  }, [loading, user, location.pathname, navigate]);

  const items = user ? NAV_BY_ROLE[user.role] : [];

  // Taking a test or interview is distraction-free (and the test page pins a
  // webcam preview to the bottom-right), so no footer there.
  const hideFooter =
    /^\/tests\/[^/]+$/.test(location.pathname) ||
    location.pathname.startsWith("/interviews/");

  // Signed-out college pages point at their sibling: register <-> log in.
  const authCta =
    location.pathname === "/college/register"
      ? { prompt: "Already registered?", label: "Log in", to: "/college" }
      : location.pathname === "/college"
      ? { prompt: "New college?", label: "Register", to: "/college/register" }
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-bg/85 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 max-w-[min(1320px,94vw)] mx-auto px-4 sm:px-8 h-[68px] sm:h-[76px]">
          <Logo />
          {!loading && !user && authCta && (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-text-2">
                {authCta.prompt}
              </span>
              <Link
                to={authCta.to}
                className="rounded-full border border-lime px-4 py-1.5 text-sm font-medium text-lime transition-colors hover:bg-lime hover:text-white"
              >
                {authCta.label}
              </Link>
            </div>
          )}
          {user && (
            <div className="flex items-center gap-2 sm:gap-3">
              <nav aria-label="Main" className="hidden sm:flex items-center gap-1">
                {items.map((item) => (
                  <NavLink key={item.to} to={item.to} className={navLinkClass}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <UserMenu user={user} items={items} />
            </div>
          )}
        </div>
      </header>
      <div className="flex-1 w-full max-w-[min(1320px,94vw)] mx-auto px-4 sm:px-8 pb-20">
        <Outlet />
      </div>
      {!hideFooter && <SiteFooter compact={loading || !!user} />}
    </div>
  );
}
