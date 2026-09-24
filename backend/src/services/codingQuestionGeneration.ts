import crypto from "crypto";
import { z } from "zod";
import { generateStructured } from "../lib/llm";
import { runInSandbox } from "./codeSandbox";
import {
  CODING_DIFFICULTIES,
  CODING_LANGUAGES,
  CodingQuestionSchema,
} from "../schemas/codingQuestion";
import type {
  CodingDifficulty,
  CodingLanguage,
  CodingQuestion,
} from "../schemas/codingQuestion";

const DIFFICULTY_GUIDANCE: Record<CodingDifficulty, string> = {
  easy:
    "EASY difficulty: solvable with basic loops, conditionals, and simple array/string operations. A competent candidate should solve it in about 5-10 minutes. No advanced data structures or algorithms required.",
  medium:
    "MEDIUM difficulty: requires a non-trivial technique such as a hash map, two pointers, sorting, or basic recursion. Should take a competent candidate about 15-20 minutes.",
  hard:
    "HARD difficulty: requires a more advanced technique such as dynamic programming, graph/tree traversal, or backtracking. Should take a competent candidate about 25-30 minutes.",
};

function systemPrompt(difficulty: CodingDifficulty): string {
  return `You are writing one original algorithmic coding problem (in the style of LeetCode -- arrays, strings, hash maps, trees, recursion, dynamic programming, etc.) for a technical skill assessment. Do NOT copy any real LeetCode problem verbatim -- write an original problem inspired by common patterns.

Difficulty target: ${DIFFICULTY_GUIDANCE[difficulty]}

Generate:
- "title": short problem name
- "topic": the general category (e.g. "Arrays & Hashing", "Two Pointers", "Recursion")
- "problemStatement": full description including 1-2 worked examples and constraints, formatted as plain text with line breaks
- "functionName": a single camelCase function name the candidate must implement
- "starterCode": a function stub for EACH of javascript, python, c, cpp. CRITICAL FORMATTING RULES:
  - The placeholder comment must be on its OWN line inside the function body, never on the same line as a closing brace (e.g. "function foo(a, b) {\n  // your code here\n}" -- NEVER "function foo(a, b) { // your code here }", since a "//" comment swallows everything after it on that line including the closing brace).
  - For c and cpp specifically: starterCode is placed FIRST in the final file, so it must contain ALL #include directives the whole file will need (both the candidate's function AND the test driver), at the very top, before the function stub. Do not assume anything is pre-included.
  - For cpp: after the includes, add "using namespace std;" so bare types like vector/string work without std:: prefixes.
- "testDriver": for EACH of the four languages, code placed AFTER the candidate's function definition in the same file. It must run several (3-6) hardcoded test cases against the candidate's function (embed the actual input/expected-output values directly -- the SAME underlying test values and the SAME number of test cases across all four languages) and print EXACTLY one line per test case, either "PASS" or "FAIL" (nothing else -- no prose, no test descriptions). Use simple, straightforward code: declare each test case's inputs/expected output as separate plain local variables rather than complex nested array/object literals, to minimize syntax mistakes. For c and cpp: testDriver must NOT contain any #include directives (they already exist in starterCode) -- only the compare/print logic and a main() function. Before comparing individual elements of an array/vector/list result, FIRST check the result's length/size matches the expected length; if it doesn't match, print "FAIL" immediately and do NOT index into the result (indexing past its actual length is a crash, not a graceful failure).
  - CRITICAL for javascript: if the function returns an array or object, you MUST wrap BOTH sides in JSON.stringify() before comparing, e.g. "JSON.stringify(result) === JSON.stringify(expected)". NEVER compare the raw function call result directly against a JSON.stringify(...) string (e.g. "myFunc(x) === JSON.stringify([1,2])" is WRONG and will always be false even for a correct solution, since an array is never === to a string). If the function returns a primitive (number/string/boolean), compare directly with === and do not use JSON.stringify at all.

Respond ONLY with JSON matching: {"title": string, "topic": string, "problemStatement": string, "functionName": string, "starterCode": {"javascript": string, "python": string, "c": string, "cpp": string}, "testDriver": {"javascript": string, "python": string, "c": string, "cpp": string}}`;
}

/** A stub that always returns undefined will always print "FAIL" whether the
 * driver's comparison logic works or is structurally broken (e.g. comparing
 * an array directly to a JSON string, which is always false in JS regardless
 * of correctness) -- so a clean stub run alone can't prove the driver would
 * ever print PASS for a genuinely correct solution. This catches the
 * specific asymmetric-JSON.stringify mistake directly via source pattern
 * matching, since there's no correct reference solution to test against. */
function hasAsymmetricStringifyBug(driverCode: string, functionName: string): boolean {
  const callPattern = new RegExp(`${functionName}\\s*\\(`);
  for (const line of driverCode.split("\n")) {
    if (!callPattern.test(line)) continue;
    const opMatch = line.match(/={2,3}/);
    if (!opMatch) continue;
    const opIndex = line.indexOf(opMatch[0]);
    const left = line.slice(0, opIndex);
    const right = line.slice(opIndex + opMatch[0].length);
    const leftHasCall = callPattern.test(left);
    const rightHasCall = callPattern.test(right);
    const leftHasStringify = left.includes("JSON.stringify(");
    const rightHasStringify = right.includes("JSON.stringify(");
    if (
      (leftHasCall && !leftHasStringify && rightHasStringify) ||
      (rightHasCall && !rightHasStringify && leftHasStringify)
    ) {
      return true;
    }
  }
  return false;
}

interface LanguageValidation {
  language: CodingLanguage;
  lineCount: number;
}

/** Actually runs the generated stub through the sandbox for each language --
 * a stub is expected to print mostly/all FAIL, but it must run cleanly (no
 * syntax error, no crash, no compile error) and print at least one PASS/FAIL
 * line. The observed line count becomes the authoritative test case count
 * for grading -- never the LLM's self-reported number, which is sometimes
 * omitted entirely and, even when present, isn't guaranteed to match what
 * the driver it wrote actually prints. */
async function validateLanguages(
  starterCode: Record<CodingLanguage, string>,
  testDriver: Record<CodingLanguage, string>,
  functionName: string
): Promise<LanguageValidation[]> {
  const checks = await Promise.all(
    CODING_LANGUAGES.map(async (lang): Promise<LanguageValidation | null> => {
      try {
        if (
          lang === "javascript" &&
          hasAsymmetricStringifyBug(testDriver[lang], functionName)
        ) {
          return null;
        }
        const fullCode = `${starterCode[lang]}\n\n${testDriver[lang]}`;
        const result = await runInSandbox(lang, fullCode);
        const clean =
          !result.compileError && !result.timedOut && !result.stderr.trim();
        if (!clean) {
          console.warn(
            `validateLanguages: ${lang} rejected -- compileError=${!!result.compileError} timedOut=${result.timedOut} stderr=${result.stderr.slice(0, 300)}`
          );
          return null;
        }

        const lineCount = result.stdout
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l === "PASS" || l === "FAIL").length;
        if (lineCount === 0) {
          console.warn(
            `validateLanguages: ${lang} produced no PASS/FAIL lines. stdout=${result.stdout.slice(0, 300)}`
          );
          return null;
        }

        return { language: lang, lineCount };
      } catch {
        return null;
      }
    })
  );
  return checks.filter((c): c is LanguageValidation => c !== null);
}

async function generateOneCodingQuestion(
  field: string,
  skills: string[],
  seniority: string,
  difficulty: CodingDifficulty
): Promise<CodingQuestion | null> {
  const userPrompt = `Field: ${field}
Seniority: ${seniority}
Candidate skills: ${skills.join(", ") || "not specified"}`;

  const q = await generateStructured(
    CodingQuestionSchema,
    systemPrompt(difficulty),
    userPrompt,
    { provider: "groq" }
  );

  const validations = await validateLanguages(
    q.starterCode,
    q.testDriver,
    q.functionName
  );
  if (validations.length === 0) return null;

  // Different languages could report different line counts if the model
  // wrote a mismatched number of test cases per language. Keep only the
  // languages that agree with the majority count so every offered language
  // grades against the same number of test cases.
  const countFrequency = new Map<number, number>();
  for (const v of validations) {
    countFrequency.set(v.lineCount, (countFrequency.get(v.lineCount) ?? 0) + 1);
  }
  const [authoritativeCount] = [...countFrequency.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0];
  const workingLanguages = validations
    .filter((v) => v.lineCount === authoritativeCount)
    .map((v) => v.language);

  const starterCode = {} as Record<CodingLanguage, string>;
  const testDriver = {} as Record<CodingLanguage, string>;
  for (const lang of workingLanguages) {
    starterCode[lang] = q.starterCode[lang];
    testDriver[lang] = q.testDriver[lang];
  }

  return {
    id: crypto.randomUUID(),
    type: "coding",
    field,
    topic: q.topic,
    title: q.title,
    difficulty,
    problemStatement: q.problemStatement,
    functionName: q.functionName,
    starterCode,
    testDriver,
    testCaseCount: authoritativeCount,
  };
}

async function generateWithRetry(
  field: string,
  skills: string[],
  seniority: string,
  difficulty: CodingDifficulty
): Promise<CodingQuestion | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const q = await generateOneCodingQuestion(field, skills, seniority, difficulty);
    if (q) return q;
  }
  return null;
}

/** Generates exactly one problem per difficulty tier (easy, medium, hard). A
 * tier can come back missing if generation/validation fails on every attempt
 * -- callers should treat 2-3 results as a valid outcome, not exactly 3,
 * since that's the realistic range given generation isn't 100% reliable. */
export async function generateCodingQuestions(
  field: string,
  skills: string[],
  seniority: string
): Promise<CodingQuestion[]> {
  const results = await Promise.allSettled(
    CODING_DIFFICULTIES.map((difficulty) =>
      generateWithRetry(field, skills, seniority, difficulty)
    )
  );

  const questions: CodingQuestion[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) questions.push(r.value);
  }
  return questions;
}

const ReferenceSolutionSchema = z.object({
  code: z.string(),
  explanation: z.string(),
});

const REFERENCE_SOLUTION_SYSTEM_PROMPT = `You are a senior software engineer writing a clean, correct reference solution to a coding interview problem, for a candidate to study after their test attempt. Write idiomatic, well-formatted code in the requested language that solves the problem completely and efficiently. Then give a short 2-4 sentence explanation of the approach (the core idea/technique, and its time complexity). Respond ONLY with JSON: {"code": string, "explanation": string}`;

/** Generated fresh per view rather than stored -- there's no persisted
 * reference solution anywhere in the schema (only the hidden test-grading
 * driver), and generateStructured is deterministic (fixed temperature/seed)
 * so repeat requests for the same problem return the same solution anyway. */
export async function generateReferenceSolution(
  problemStatement: string,
  functionName: string,
  language: CodingLanguage
): Promise<{ code: string; explanation: string }> {
  const userPrompt = `Language: ${language}
Function name to implement: ${functionName}

Problem statement:
${problemStatement}`;

  return generateStructured(
    ReferenceSolutionSchema,
    REFERENCE_SOLUTION_SYSTEM_PROMPT,
    userPrompt,
    { provider: "groq" }
  );
}
