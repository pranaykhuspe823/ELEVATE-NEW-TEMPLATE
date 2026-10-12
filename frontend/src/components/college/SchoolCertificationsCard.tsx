import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { ExternalIcon, ShieldIcon } from "../faculty/icons";
import { Avatar, CardHeader, EmptyState } from "../faculty/ui";

interface SchoolCertification {
  code: string;
  cert_title: string;
  course_title: string;
  cpd_hours: number | null;
  issued_at: string;
  teacher_name: string | null;
  teacher_email: string;
}

const CORE5CAMPUS_URL =
  (import.meta.env.VITE_CORE5CAMPUS_URL as string | undefined) || "http://localhost:3006";

function formatIssued(value: string) {
  // Core5 Campus stores 'YYYY-MM-DD HH:MM:SS' in UTC
  return new Date(value.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Core5 Campus certificates your teachers earned while at your college.
 * Only this college's records are ever returned by the API. */
export default function SchoolCertificationsCard() {
  const [certs, setCerts] = useState<SchoolCertification[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ certificates: SchoolCertification[] }>("/api/colleges/certifications")
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

  const totalCpd = certs?.reduce((n, c) => n + (c.cpd_hours ?? 0), 0) ?? 0;

  return (
    <section className="card mt-4">
      <CardHeader
        icon={<ShieldIcon width={18} height={18} />}
        title="Teacher certifications"
        subtitle={
          certs && certs.length > 0
            ? `${certs.length} certificate${certs.length === 1 ? "" : "s"} · ${totalCpd} CPD hours earned on Core5 Campus`
            : "Certificates your faculty earn on Core5 Campus appear here."
        }
      />

      {certs === null ? (
        <div className="h-16 rounded-xl bg-card-2 animate-pulse" aria-hidden="true" />
      ) : certs.length === 0 ? (
        <EmptyState icon={<ShieldIcon width={24} height={24} />}>
          No certificates yet. Faculty sign in to Core5 Campus with their Elevate
          email and password, and what they earn is saved to your college.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {certs.map((c) => (
            <li
              key={c.code}
              className="flex flex-col sm:flex-row sm:items-center gap-3.5 rounded-xl border-2 border-border-strong px-4 py-3.5"
            >
              <Avatar name={c.teacher_name} email={c.teacher_email} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-snug truncate">
                  {c.teacher_name ?? c.teacher_email}
                </p>
                <p className="text-text-2 text-[13px] mt-0.5">
                  {c.cert_title}
                  {c.cpd_hours ? ` · ${c.cpd_hours} CPD hrs` : ""}
                </p>
                <p className="text-text-3 text-[12px] mt-0.5">
                  Issued {formatIssued(c.issued_at)}
                </p>
              </div>
              <a
                href={`${CORE5CAMPUS_URL}/verify/${c.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-small inline-flex items-center gap-1.5 no-underline whitespace-nowrap flex-none"
              >
                Verify
                <ExternalIcon width={13} height={13} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
