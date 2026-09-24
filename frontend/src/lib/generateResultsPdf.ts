import jsPDF from "jspdf";

interface TopicStat {
  correct: number;
  total: number;
}

interface McqBreakdownEntry {
  id: string;
  type: "mcq";
  question: string;
  options: string[];
  userAnswerIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
}

interface CodingBreakdownEntry {
  id: string;
  type: "coding";
  title: string;
  difficulty: string;
  problemStatement: string;
  passed: number;
  total: number;
  isCorrect: boolean;
}

type QuestionBreakdownEntry = McqBreakdownEntry | CodingBreakdownEntry;

export interface ReferenceSolution {
  code: string;
  explanation: string;
}

interface ResultsForPdf {
  score: number;
  topicBreakdown: Record<string, TopicStat>;
  startedAt: string;
  completedAt: string;
  questionBreakdown: QuestionBreakdownEntry[];
}

const MARGIN = 18;
const PAGE_HEIGHT = 297;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function generateResultsPdf(
  results: ResultsForPdf,
  solutions: Record<string, ReferenceSolution>
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  function ensureSpace(lineHeightMm: number) {
    if (y + lineHeightMm > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function write(
    text: string,
    opts: {
      size?: number;
      style?: "normal" | "bold";
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
      color = [30, 30, 30],
      indent = 0,
      gapAfter = 0,
    } = opts;
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lineHeight = size * 0.45;
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, MARGIN + indent, y);
      y += lineHeight;
    }
    y += gapAfter;
  }

  const CORRECT_COLOR: [number, number, number] = [15, 118, 110];
  const INCORRECT_COLOR: [number, number, number] = [190, 40, 40];

  write("Skill Test Report", { size: 20, style: "bold", gapAfter: 2 });
  write(`Score: ${results.score.toFixed(1)}/10`, { size: 12, style: "bold" });

  const durationMs =
    new Date(results.completedAt).getTime() - new Date(results.startedAt).getTime();
  const minutes = Math.max(0, Math.floor(durationMs / 60000));
  const seconds = Math.max(0, Math.round((durationMs % 60000) / 1000));
  write(`Time taken: ${minutes} min ${seconds.toString().padStart(2, "0")}s`, {
    size: 10,
    gapAfter: 4,
  });

  write("By Topic", { size: 14, style: "bold", gapAfter: 1 });
  for (const [topic, stat] of Object.entries(results.topicBreakdown)) {
    const correctDisplay = Number.isInteger(stat.correct)
      ? stat.correct
      : stat.correct.toFixed(1);
    write(`${topic}: ${correctDisplay}/${stat.total}`, { size: 10 });
  }
  y += 4;

  write("Question Review", { size: 14, style: "bold", gapAfter: 1 });

  results.questionBreakdown.forEach((q, index) => {
    ensureSpace(6);
    y += 2;
    const statusColor = q.isCorrect ? CORRECT_COLOR : INCORRECT_COLOR;

    if (q.type === "mcq") {
      write(`${index + 1}. ${q.question}`, { size: 11, style: "bold" });
      write(q.isCorrect ? "Correct" : "Incorrect", {
        size: 9,
        style: "bold",
        color: statusColor,
        indent: 4,
        gapAfter: 1,
      });
      q.options.forEach((opt, i) => {
        const marker =
          i === q.correctIndex
            ? "[correct] "
            : i === q.userAnswerIndex
            ? "[your answer] "
            : "";
        write(`${marker}${opt}`, { size: 10, indent: 4 });
      });
    } else {
      write(`${index + 1}. ${q.title} (${q.difficulty})`, {
        size: 11,
        style: "bold",
      });
      write(
        `${q.isCorrect ? "Correct" : "Incorrect"} — ${q.passed}/${q.total} tests passed`,
        { size: 9, style: "bold", color: statusColor, indent: 4, gapAfter: 1 }
      );
      write("Problem:", { size: 9, style: "bold", indent: 4 });
      write(q.problemStatement, { size: 9, indent: 4, gapAfter: 1 });

      const solution = solutions[q.id];
      if (solution) {
        write("Reference solution:", { size: 9, style: "bold", indent: 4 });
        write(solution.explanation, { size: 9, indent: 4, gapAfter: 1 });
        write(solution.code, { size: 8, font: "courier", indent: 4 });
      }
    }
    y += 3;
  });

  doc.save("test-results.pdf");
}
