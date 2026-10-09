import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { db } from '../db.js';
import SVGtoPDF from 'svg-to-pdfkit';
import { courseStats } from '../data/lessons/index.js';
import { ASSETS, badgeFor, badgeSvg } from './badge.js';
import path from 'node:path';
import { sendToCredly } from './credly.js';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I
const randomCode = (n) => Array.from(crypto.randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join('');
const publicUrl = () => (process.env.PUBLIC_URL || 'http://localhost:3006').replace(/\/$/, '');

export const verifyUrl = (code) => `${publicUrl()}/verify/${code}`;

export async function issueCertificate({ enrollmentId, score = null }) {
  const cert = await db.tx(async (tx) => {
    // Lock the enrolment so two simultaneous passes can't both issue a certificate
    const row = await tx.get(`SELECT e.id, e.user_id, e.course_id, u.name, c.title, c.cert_title, c.cert_prefix, c.cpd_hours
      FROM enrollments e JOIN users u ON u.id=e.user_id JOIN courses c ON c.id=e.course_id WHERE e.id=? FOR UPDATE OF e`, enrollmentId);
    if (!row) throw new Error('Enrolment not found');
    const existing = await tx.get("SELECT * FROM certificates WHERE enrollment_id=? AND status='valid'", enrollmentId);
    if (existing) return { ...existing, existed: true };
    const yy = String(new Date().getFullYear()).slice(2);
    let code;
    do { code = `C5C-${row.cert_prefix || 'CRT'}-${yy}-${randomCode(6)}`; }
    while (await tx.get('SELECT 1 FROM certificates WHERE code=?', code));
    const { rows: [created] } = await tx.run(`INSERT INTO certificates (code, user_id, course_id, enrollment_id, holder_name, course_title, cert_title, cpd_hours, score)
      VALUES (?,?,?,?,?,?,?,?,?) RETURNING *`, code, row.user_id, row.course_id, row.id, row.name, row.title, row.cert_title || row.title, row.cpd_hours, score);
    await tx.run("UPDATE enrollments SET status='completed' WHERE id=?", row.id);
    return created;
  });
  const { existed, ...result } = cert;
  // In the background: the learner gets their certificate straight away
  if (!existed) sendToCredly(result.id).catch((err) => console.error('[credly]', err));
  return result;
}

const GREEN = '#12372A', GOLD = '#C98A00', INK = '#0E1F18', MUTED = '#5B6B62';

// Certificate layout: white card with a thin border, Core5Campus name top left, partner-badge box top right, angled accent band bottom left,
// centred title, "Issued to", the holder's name, the course badge, issue details and a verification link.
export async function certificatePdf(cert, res) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: { Title: `${cert.cert_title} - ${cert.holder_name}`, Author: 'Core5Campus' } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cert.code}.pdf"`);
  doc.pipe(res);
  const W = doc.page.width, H = doc.page.height;
  const card = { x: 64, y: 30, w: W - 114, h: H - 70 };
  const right = card.x + card.w, bottom = card.y + card.h, cx = card.x + card.w / 2;

  doc.rect(0, 0, W, H).fill('#F4F5F2');
  // Accent band: rises up the left side and runs along the bottom, behind the card
  doc.polygon([card.x - 30, 300], [card.x, 270], [card.x, bottom], [card.x + 400, bottom], [card.x + 430, bottom + 24], [card.x - 30, bottom + 24]).fill('#F5B301');
  doc.polygon([card.x - 30, bottom + 24], [card.x + 430, bottom + 24], [card.x + 440, bottom + 32], [card.x - 30, bottom + 32]).fill(GREEN);
  doc.rect(card.x, card.y, card.w, card.h).fill('#FFFFFF');
  doc.lineWidth(0.8).strokeColor('#B8C1BA').rect(card.x, card.y, card.w, card.h).stroke();

  // Name, top left
  doc.font('Helvetica-Bold').fontSize(22).fillColor(GREEN)
    .text('Core5', card.x + 28, card.y + 32, { lineBreak: false, continued: true }).fillColor('#D99A00').text('Campus');

  // Top right: Google for Education Partner badge
  const partnerW = 190;
  doc.image(path.join(ASSETS, 'google-for-education-partner.png'), right - 24 - partnerW, card.y + 20, { width: partnerW });

  // Title, recipient, badge
  const tw = 600;
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(28).text(cert.cert_title, cx - tw / 2, 160, { width: tw, align: 'center', lineGap: 2 });
  let y = doc.y + 30;
  doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text('ISSUED TO', cx - 100, y, { width: 200, align: 'center', characterSpacing: 1 });
  y = doc.y + 8;
  doc.fillColor(INK).font('Helvetica').fontSize(22).text(cert.holder_name, cx - tw / 2, y, { width: tw, align: 'center' });
  y = doc.y + 20;
  const slug = (await db.get('SELECT slug FROM courses WHERE id=?', cert.course_id))?.slug;
  const badge = badgeFor(slug);
  if (badge) { SVGtoPDF(doc, badgeSvg(badge).replace(' width="240" height="280"', ''), cx - 55, y, { width: 110, height: 128 }); y += 138; }

  // Issue details and verification
  const issued = new Date(cert.issued_at.replace(' ', 'T') + 'Z')
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const details = [`Issued on: ${issued}`, 'Issued by: Core5Campus', cert.cpd_hours ? `${cert.cpd_hours} CPD hours` : null, `ID: ${cert.code}`].filter(Boolean).join('  |  ');
  doc.fillColor(INK).font('Helvetica').fontSize(8.5).text(details, cx - tw / 2, y + 12, { width: tw, align: 'center' });
  doc.fillColor(MUTED).text(`Verify: ${verifyUrl(cert.code)}`, cx - tw / 2, doc.y + 4, { width: tw, align: 'center' });

  const qr = await QRCode.toBuffer(verifyUrl(cert.code), { margin: 0, width: 200, color: { dark: '#12372A', light: '#FFFFFF' } });
  doc.image(qr, right - 78, bottom - 86, { width: 54 });
  doc.fillColor(MUTED).fontSize(6.5).text('Scan to verify', right - 90, bottom - 28, { width: 78, align: 'center' });
  doc.end();
}

export function syllabusPdf(course, content, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: `${course.title} - Syllabus`, Author: 'Core5Campus' } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="core5campus-${course.slug}-syllabus.pdf"`);
  doc.pipe(res);
  doc.rect(0, 0, doc.page.width, 10).fill(GREEN);
  doc.font('Helvetica-Bold').fontSize(20).fillColor(GREEN).text('Core5', 56, 38, { continued: true }).fillColor('#D99A00').text('Campus');
  doc.y = 80;
  doc.moveDown(1.2).fillColor(INK).font('Helvetica-Bold').fontSize(24).text(course.title);
  doc.moveDown(0.3).fillColor(MUTED).font('Helvetica').fontSize(12).text(course.tagline || '');
  doc.moveDown(0.6).fillColor(INK).fontSize(10.5).text(
    `Self-paced online  |  ${courseStats(course.slug).lesson_count} lessons  |  ${course.cpd_hours} CPD hours  |  Certificate: ${course.cert_title}`);
  doc.moveDown(0.8).fontSize(11).fillColor(INK).text(content.summary || '', { lineGap: 3 });
  const heading = (t) => { doc.moveDown(1).fillColor(GREEN).font('Helvetica-Bold').fontSize(14).text(t); doc.moveDown(0.3); };
  heading('Syllabus');
  (content.modules || []).forEach((m, i) => {
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11.5).text(`Module ${i + 1}: ${m.title}`);
    doc.font('Helvetica').fontSize(10.5).fillColor('#2B3A32').list(m.points || [], { bulletRadius: 1.6, textIndent: 12, lineGap: 2 });
    doc.moveDown(0.5);
  });
  heading('What you will be able to do');
  doc.font('Helvetica').fontSize(10.5).fillColor('#2B3A32').list((content.outcomes || []).map((o) => `${o.t}: ${o.d}`), { bulletRadius: 1.6, textIndent: 12, lineGap: 2 });
  heading('Certification path');
  (content.path || []).forEach((p, i) => {
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(`${i + 1}. ${p.t}`, { continued: true }).font('Helvetica').fillColor('#2B3A32').text(`  ${p.d}`);
  });
  heading('What is included');
  doc.font('Helvetica').fontSize(10.5).fillColor('#2B3A32').list(content.includes || [], { bulletRadius: 1.6, textIndent: 12, lineGap: 2 });
  doc.moveDown(1.2).fillColor(MUTED).fontSize(9).text(`${publicUrl()}/courses/${course.slug}`);
  doc.end();
}
