import { Prisma } from "@prisma/client";
import fetch from "node-fetch";
import { prisma } from "./prisma";

// Core5 Campus keeps its tables in this schema of the same database (see
// core5Campus/backend/src/db.js). Must match its DB_SCHEMA.
const SCHEMA = process.env.CORE5_DB_SCHEMA || "core5";
if (!/^[a-z_][a-z0-9_]*$/.test(SCHEMA)) {
  throw new Error("CORE5_DB_SCHEMA must be a plain lowercase identifier.");
}
const t = (table: string) => Prisma.raw(`"${SCHEMA}"."${table}"`);

export interface Core5Certificate {
  code: string;
  course_title: string;
  cert_title: string;
  cpd_hours: number | null;
  score: number | null;
  issued_at: string;
  slug: string;
}

export interface Core5SchoolCertificate extends Core5Certificate {
  teacher_name: string | null;
  teacher_email: string;
}

/** Core5 Campus not started yet (its schema/tables don't exist): no
 * certificates rather than an error. */
async function softly<T>(query: Promise<T[]>): Promise<T[]> {
  try {
    return await query;
  } catch (err: any) {
    const code = err?.meta?.code ?? err?.code;
    if (code === "42P01" || code === "3F000") return [];
    throw err;
  }
}

/** A teacher's own valid certificates -- everything they earned, wherever
 * they taught at the time. */
export function certificatesForTeacher(elevateUserId: string) {
  return softly(
    prisma.$queryRaw<Core5Certificate[]>`
      SELECT x.code, x.course_title, x.cert_title, x.cpd_hours, x.score, x.issued_at, c.slug
      FROM ${t("certificates")} x
      JOIN ${t("users")} u ON u.id = x.user_id
      JOIN ${t("courses")} c ON c.id = x.course_id
      WHERE u.elevate_user_id = ${elevateUserId} AND x.status = 'valid'
      ORDER BY x.issued_at DESC`
  );
}

/** Certificates earned while at this college -- and only this college. The
 * college is stamped on each certificate when it's issued. */
export function certificatesForCollege(collegeId: string) {
  return softly(
    prisma.$queryRaw<Core5SchoolCertificate[]>`
      SELECT x.code, x.course_title, x.cert_title, x.cpd_hours, x.score, x.issued_at, c.slug,
        COALESCE(ev.name, x.holder_name) AS teacher_name, u.email AS teacher_email
      FROM ${t("certificates")} x
      JOIN ${t("users")} u ON u.id = x.user_id
      JOIN ${t("courses")} c ON c.id = x.course_id
      LEFT JOIN public.users ev ON ev.id = u.elevate_user_id
      WHERE x.college_id = ${collegeId} AND x.status = 'valid'
      ORDER BY x.issued_at DESC`
  );
}

/** Fetches a certificate PDF from Core5 Campus server-to-server. Core5
 * re-checks that the certificate belongs to this Elevate account. Null when
 * Core5 isn't configured/reachable or the certificate isn't theirs. */
export async function fetchCertificatePdf(
  code: string,
  elevateUserId: string
): Promise<Buffer | null> {
  const base = process.env.CORE5CAMPUS_API_URL;
  const key = process.env.CORE5CAMPUS_SERVICE_KEY;
  if (!base || !key) return null;
  const url = `${base}/api/service/certificates/${encodeURIComponent(code)}/pdf?elevate_user_id=${encodeURIComponent(elevateUserId)}`;
  const res = await fetch(url, { headers: { "X-Service-Key": key }, timeout: 20000 });
  if (!res.ok) return null;
  return res.buffer();
}
