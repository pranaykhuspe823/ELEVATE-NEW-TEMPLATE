import jsPDF from "jspdf";

interface TranscriptTurn {
  role: "interviewer" | "candidate";
  text: string;
}

interface Feedback {
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
}

interface InterviewForPdf {
  transcript: TranscriptTurn[];
  overallScore: number | null;
  communicationScore: number | null;
  technicalDepthScore: number | null;
  resumeConsistencyScore: number | null;
  confidenceScore: number | null;
  feedback: Feedback | null;
  recommendation: string | null;
  recommendationReason: string | null;
  detailedFeedback: string | null;
}

const MARGIN = 16;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const NAVY: [number, number, number] = [30, 58, 110];
const GOLD: [number, number, number] = [201, 152, 45];
const TEAL: [number, number, number] = [15, 118, 110];
const AMBER: [number, number, number] = [178, 128, 22];
const RED: [number, number, number] = [190, 40, 40];
const INK: [number, number, number] = [35, 38, 45];
const MUTED: [number, number, number] = [110, 116, 128];
const PALE: [number, number, number] = [244, 245, 248];

const RECOMMENDATION_COLOR: Record<string, [number, number, number]> = {
  "Strong Hire": TEAL,
  Hire: TEAL,
  "Lean Hire": AMBER,
  "No Hire": RED,
};

export function generateInterviewReportPdf(interview: InterviewForPdf): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  function ensureSpace(heightMm: number) {
    if (y + heightMm > PAGE_HEIGHT - MARGIN - 10) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function write(
    text: string,
    opts: {
      size?: number;
      style?: "normal" | "bold" | "italic";
      font?: "helvetica" | "courier";
      color?: [number, number, number];
      indent?: number;
      gapAfter?: number;
    } = {}
  ) {
    const {
      size = 10,
      style = "normal",
      font = "helvetica",
      color = INK,
      indent = 0,
      gapAfter = 0,
    } = opts;
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lineHeight = size * 0.45;
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, MARGIN + indent, y);
      y += lineHeight;
    }
    y += gapAfter;
  }

  function sectionHeading(text: string) {
    ensureSpace(12);
    y += 3;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y, MARGIN + 10, y);
    write(text, { size: 13, style: "bold", color: NAVY, indent: 0, gapAfter: 2 });
  }

  function bulletList(items: string[], color: [number, number, number]) {
    for (const item of items) {
      ensureSpace(6);
      doc.setFillColor(...color);
      doc.circle(MARGIN + 1.2, y - 1.2, 0.8, "F");
      write(item, { size: 10, indent: 5 });
    }
  }

  // ---- Header band ----
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_WIDTH, 34, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...GOLD);
  doc.text("Elevate", MARGIN, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("AI Mock Interview Report", MARGIN, 24);
  doc.setFontSize(8.5);
  doc.setTextColor(220, 224, 232);
  doc.text(`Generated ${new Date().toLocaleString()}`, MARGIN, 30);
  y = 44;

  // ---- Overall score + recommendation ----
  const overall = interview.overallScore !== null ? Math.round(interview.overallScore) : null;
  doc.setFillColor(...PALE);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 26, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...NAVY);
  doc.text(overall !== null ? `${overall}` : "—", MARGIN + 6, y + 18);
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text("/ 100 overall", MARGIN + 6 + (overall !== null ? String(overall).length * 6.5 : 4), y + 18);

  if (interview.recommendation) {
    const recColor = RECOMMENDATION_COLOR[interview.recommendation] ?? MUTED;
    const label = interview.recommendation;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const labelWidth = doc.getTextWidth(label) + 10;
    const badgeX = MARGIN + CONTENT_WIDTH - labelWidth - 6;
    doc.setFillColor(...recColor);
    doc.roundedRect(badgeX, y + 8, labelWidth, 9, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(label, badgeX + labelWidth / 2, y + 14, { align: "center" });
  }
  y += 34;

  // ---- Score tiles ----
  const tiles: Array<{ label: string; score: number | null }> = [
    { label: "Communication", score: interview.communicationScore },
    { label: "Technical Depth", score: interview.technicalDepthScore },
    { label: "Resume Consistency", score: interview.resumeConsistencyScore },
    { label: "Confidence", score: interview.confidenceScore },
  ];
  const tileGap = 4;
  const tileWidth = (CONTENT_WIDTH - tileGap * (tiles.length - 1)) / tiles.length;
  const tileHeight = 22;
  tiles.forEach((tile, i) => {
    const x = MARGIN + i * (tileWidth + tileGap);
    doc.setDrawColor(225, 228, 234);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, tileWidth, tileHeight, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...NAVY);
    doc.text(tile.score !== null ? `${Math.round(tile.score)}` : "—", x + tileWidth / 2, y + 11, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    const labelLines = doc.splitTextToSize(tile.label, tileWidth - 4) as string[];
    let ly = y + 16.5;
    for (const line of labelLines) {
      doc.text(line, x + tileWidth / 2, ly, { align: "center" });
      ly += 3.2;
    }
  });
  y += tileHeight + 10;

  // ---- Recommendation reasoning ----
  if (interview.recommendationReason) {
    sectionHeading("Recommendation");
    write(interview.recommendationReason, { size: 10.5, style: "italic", color: INK, gapAfter: 2 });
  }

  // ---- Detailed feedback ----
  if (interview.detailedFeedback) {
    sectionHeading("Detailed Feedback");
    write(interview.detailedFeedback, { size: 10.5, gapAfter: 2 });
  }

  // ---- Strengths / weaknesses / red flags ----
  if (interview.feedback) {
    if (interview.feedback.strengths.length > 0) {
      sectionHeading("Strengths");
      bulletList(interview.feedback.strengths, TEAL);
      y += 2;
    }
    if (interview.feedback.weaknesses.length > 0) {
      sectionHeading("Weaknesses");
      bulletList(interview.feedback.weaknesses, AMBER);
      y += 2;
    }
    if (interview.feedback.redFlags.length > 0) {
      sectionHeading("Red Flags");
      bulletList(interview.feedback.redFlags, RED);
      y += 2;
    }
  }

  // ---- Transcript ----
  sectionHeading("Interview Transcript");
  interview.transcript.forEach((turn) => {
    ensureSpace(10);
    const isCandidate = turn.role === "candidate";
    write(isCandidate ? "You" : "AI Interviewer", {
      size: 9,
      style: "bold",
      color: isCandidate ? NAVY : GOLD,
      gapAfter: 0.5,
    });
    write(turn.text, { size: 10, indent: 3, gapAfter: 3 });
  });

  // ---- Footer on every page ----
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(225, 228, 234);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Elevate — AI Mock Interview Report", MARGIN, PAGE_HEIGHT - 7);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 7, {
      align: "right",
    });
  }

  doc.save("interview-report.pdf");
}
