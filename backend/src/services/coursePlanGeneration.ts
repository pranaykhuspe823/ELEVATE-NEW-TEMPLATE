import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateStructured } from "../lib/llm";

interface TopicStat {
  correct: number;
  total: number;
}

const CoursePlanModuleSchema = z.object({
  title: z.string(),
  topic: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  estimatedHours: z.number().min(0.5).max(20),
});

const CoursePlanModulesSchema = z.object({
  modules: z.array(CoursePlanModuleSchema).min(1).max(8),
});

const COURSE_PLAN_SYSTEM_PROMPT = `You are designing a personalized learning plan for a job candidate based on their skill assessment results. You are given only their WEAK and FAIR performing topics (strong topics are excluded on purpose -- do not invent modules for topics not listed). For EACH topic given, create one focused, actionable course module to help them close that specific gap. Weak topics get "high" priority, fair topics get "medium" priority. Give each module a specific, actionable title (not just the topic name restated -- e.g. "Database indexing fundamentals" not "SQL"), the topic it targets (must match one of the given topics exactly), a priority, and a realistic estimated hours to complete (0.5-20). Respond ONLY with JSON: {"modules": [{"title": string, "topic": string, "priority": "high"|"medium"|"low", "estimatedHours": number}]}`;

interface GeneratedModule {
  title: string;
  topic: string;
  priority: "high" | "medium" | "low";
  estimatedHours: number;
}

async function generateModulesWithLLM(
  field: string,
  weakOrFairTopics: Record<string, TopicStat>
): Promise<GeneratedModule[]> {
  const lines = Object.entries(weakOrFairTopics)
    .map(([topic, stat]) => {
      const ratio = stat.total > 0 ? stat.correct / stat.total : 0;
      const label = ratio >= 0.4 ? "Fair" : "Weak";
      return `${topic}: ${label} (${stat.correct}/${stat.total} correct)`;
    })
    .join("\n");

  const userPrompt = `Field: ${field}\nTopics needing improvement:\n${lines}`;

  const result = await generateStructured(
    CoursePlanModulesSchema,
    COURSE_PLAN_SYSTEM_PROMPT,
    userPrompt
  );
  return result.modules;
}

/** Never let the model invent a specific course/article URL -- it can't
 * verify one exists. Search-result links are always valid, always current,
 * and let each platform's own relevance/popularity sort surface whatever's
 * actually trending there right now -- without us fabricating a claim. */
export function buildResources(title: string) {
  const query = encodeURIComponent(title);
  return [
    {
      platform: "YouTube",
      type: "video",
      url: `https://www.youtube.com/results?search_query=${query}`,
    },
    {
      platform: "Udemy",
      type: "course",
      url: `https://www.udemy.com/courses/search/?q=${query}`,
    },
    {
      platform: "Coursera",
      type: "course",
      url: `https://www.coursera.org/search?query=${query}`,
    },
    {
      platform: "Google",
      type: "article",
      url: `https://www.google.com/search?q=${query}`,
    },
  ];
}

export async function generateCoursePlan(testId: string) {
  const attempt = await prisma.testAttempt.findFirst({
    where: { testId, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
  });
  if (!attempt || !attempt.topicBreakdownJson) {
    throw new Error("No completed test attempt found for this test.");
  }

  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) {
    throw new Error("Test not found.");
  }

  const analysis = await prisma.analysis.findFirst({
    where: { resumeId: test.resumeId },
    orderBy: { createdAt: "desc" },
  });
  const field = analysis?.detectedField ?? "General";

  const topicBreakdown = JSON.parse(attempt.topicBreakdownJson) as Record<
    string,
    TopicStat
  >;

  const weakOrFair = Object.fromEntries(
    Object.entries(topicBreakdown).filter(
      ([, stat]) => stat.total > 0 && stat.correct / stat.total < 0.75
    )
  );

  const plan = await prisma.coursePlan.create({
    data: { testAttemptId: attempt.id, modulesJson: "[]" },
  });

  if (Object.keys(weakOrFair).length === 0) {
    return { planId: plan.id, moduleCount: 0 };
  }

  const modules = await generateModulesWithLLM(field, weakOrFair);

  await prisma.coursePlan.update({
    where: { id: plan.id },
    data: { modulesJson: JSON.stringify(modules) },
  });

  await prisma.courseModule.createMany({
    data: modules.map((m) => ({
      coursePlanId: plan.id,
      title: m.title,
      topic: m.topic,
      priority: m.priority,
      estimatedHours: m.estimatedHours,
      resourcesJson: JSON.stringify(buildResources(m.title)),
    })),
  });

  return { planId: plan.id, moduleCount: modules.length };
}
