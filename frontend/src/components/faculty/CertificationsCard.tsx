import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { CardHeader, EmptyState } from "./ui";
import { ExternalIcon, EyeIcon, ShieldIcon } from "./icons";

interface Certification {
  code: string;
  course_title: string;
  cert_title: string;
  cpd_hours: number | null;
  score: number | null;
  issued_at: string;
  slug: string;
}

const CORE5CAMPUS_URL =
  (import.meta.env.VITE_CORE5CAMPUS_URL as string | undefined) || "http://localhost:3006";

function formatIssued(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Core5 Campus is a separate certification product (own accounts, own
 * database). This card links faculty out to it and -- when
 * CORE5CAMPUS_API_URL/CORE5CAMPUS_SERVICE_KEY are configured on the backend
 * -- shows whatever certificates they've already earned there, looked up by
 * their email server-to-server. */
export default function CertificationsCard() {
  const [certs, setCerts] = useState<Certification[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ certificates: Certification[] }>("/api/faculty/certifications")
      .then((res) => {
        if (!cancelled) setCerts(res.data.certificates);
      })
      .catch(() => {
        if (!cancelled) setCerts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="card mt-5">
      <CardHeader
        icon={<ShieldIcon width={18} height={18} />}
        title="Certifications"
        subtitle="Earn credentials on Core5 Campus — they show up here automatically."
        right={
          <a
            href={`${CORE5CAMPUS_URL}/courses`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-small inline-flex items-center gap-1.5 no-underline whitespace-nowrap"
          >
            Get certified
            <ExternalIcon width={13} height={13} />
          </a>
        }
      />

      {certs === null ? (
        <div className="h-16 rounded-xl bg-card-2 animate-pulse" aria-hidden="true" />
      ) : certs.length === 0 ? (
        <EmptyState icon={<ShieldIcon width={24} height={24} />}>
          No certifications yet. Take a course on Core5 Campus to earn your
          first one.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {certs.map((c) => (
            <li
              key={c.code}
              className="flex flex-col sm:flex-row sm:items-center gap-3.5 rounded-xl border-2 border-border-strong px-4 py-3.5"
            >
              <span className="flex-none w-11 h-11 rounded-xl border-2 border-border bg-lime/10 text-lime flex items-center justify-center">
                <ShieldIcon width={18} height={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-snug truncate">
                  {c.cert_title}
                </p>
                <p className="text-text-2 text-[13px] mt-0.5">
                  {c.course_title}
                  {c.cpd_hours ? ` · ${c.cpd_hours} CPD hrs` : ""}
                </p>
                <p className="text-text-3 text-[12px] mt-0.5">
                  Issued {formatIssued(c.issued_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-none">
                <a
                  href={`${CORE5CAMPUS_URL}/verify/${c.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-small inline-flex items-center gap-1.5 no-underline whitespace-nowrap"
                >
                  <EyeIcon width={13} height={13} />
                  View certificate
                </a>
                <a
                  href={`${CORE5CAMPUS_URL}/api/badges/${c.slug}.svg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-small inline-flex items-center gap-1.5 no-underline whitespace-nowrap"
                >
                  <ShieldIcon width={13} height={13} />
                  View badge
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
