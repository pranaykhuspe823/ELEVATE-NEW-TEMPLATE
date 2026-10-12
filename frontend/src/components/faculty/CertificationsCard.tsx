import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { CardHeader, EmptyState } from "./ui";
import { CloseIcon, DownloadIcon, ExternalIcon, ShieldIcon } from "./icons";

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
// Badges are public images served by Core5 Campus (its site proxies /api).
const badgeUrl = (slug: string) => `${CORE5CAMPUS_URL}/api/badges/${slug}.svg`;

function formatIssued(value: string) {
  // Core5 Campus stores 'YYYY-MM-DD HH:MM:SS' in UTC
  return new Date(value.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Click a badge: its details, and the certificate PDF to download. */
function CertificateDialog({ cert, onClose }: { cert: Certification; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const { data } = await api.get<Blob>(
        `/api/faculty/certifications/${encodeURIComponent(cert.code)}/pdf`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cert.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Couldn't download the certificate. Try again in a moment.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cert-dialog-title"
        className="card relative w-full max-w-[420px] !p-6 sm:!p-7 shadow-lg text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 p-1.5 rounded-lg text-text-2 hover:text-text hover:bg-card-2 transition"
        >
          <CloseIcon width={18} height={18} />
        </button>

        <img
          src={badgeUrl(cert.slug)}
          alt={`${cert.cert_title} badge`}
          className="w-40 h-40 mx-auto object-contain"
        />
        <h3 id="cert-dialog-title" className="text-[18px] leading-snug mt-4">
          {cert.cert_title}
        </h3>
        <p className="text-text-2 text-[13px] mt-1">
          {cert.course_title}
          {cert.cpd_hours ? ` · ${cert.cpd_hours} CPD hrs` : ""}
        </p>
        <p className="text-text-3 text-[12px] mt-1">
          Issued {formatIssued(cert.issued_at)} · <span className="font-mono">{cert.code}</span>
        </p>

        <button
          type="button"
          className="btn btn-primary w-full !py-3 mt-5 inline-flex items-center justify-center gap-2 disabled:opacity-60"
          onClick={() => void download()}
          disabled={downloading}
        >
          <DownloadIcon width={16} height={16} />
          {downloading ? "Preparing PDF…" : "Download certificate"}
        </button>
        <a
          href={`${CORE5CAMPUS_URL}/verify/${cert.code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-lime hover:underline"
        >
          Verify online
          <ExternalIcon width={12} height={12} />
        </a>
        {error && (
          <p role="alert" className="text-coral text-[13px] mt-3">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** Badges earned on Core5 Campus (shares Elevate's database; faculty sign in
 * there with their Elevate login). Click one to download its certificate. */
export default function CertificationsCard() {
  const [certs, setCerts] = useState<Certification[] | null>(null);
  const [open, setOpen] = useState<Certification | null>(null);

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
        subtitle="Sign in to Core5 Campus with your Elevate email and password — badges you earn show up here."
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
        <div className="h-32 rounded-xl bg-card-2 animate-pulse" aria-hidden="true" />
      ) : certs.length === 0 ? (
        <EmptyState icon={<ShieldIcon width={24} height={24} />}>
          No certifications yet. Take a course on Core5 Campus to earn your
          first badge.
        </EmptyState>
      ) : (
        <ul className="flex flex-wrap gap-4">
          {certs.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => setOpen(c)}
                title={`${c.cert_title} — click to download the certificate`}
                className="group flex flex-col items-center w-[132px] rounded-2xl p-2 transition hover:bg-card-2 focus-visible:bg-card-2"
              >
                <img
                  src={badgeUrl(c.slug)}
                  alt={`${c.cert_title} badge`}
                  className="w-28 h-28 object-contain transition group-hover:scale-105"
                  loading="lazy"
                />
                <span className="text-[12px] font-semibold leading-tight text-center mt-2 line-clamp-2">
                  {c.cert_title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <CertificateDialog cert={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
