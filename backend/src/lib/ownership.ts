import { prisma } from "./prisma";

export async function findOwnedResume(userId: string, resumeId: string) {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume || resume.userId !== userId) return null;
  return resume;
}

export async function findOwnedTest(userId: string, testId: string) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { resume: true },
  });
  if (!test || test.resume.userId !== userId) return null;
  return test;
}

export async function findOwnedInterview(userId: string, interviewId: string) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { resume: true },
  });
  if (!interview || interview.resume.userId !== userId) return null;
  return interview;
}

/** A student record, but only if they're actually linked to this faculty. */
export async function findFacultyStudent(facultyId: string, studentId: string) {
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT" || student.facultyId !== facultyId) {
    return null;
  }
  return student;
}

export async function findOwnedFixSuggestion(userId: string, suggestionId: string) {
  const suggestion = await prisma.fixSuggestion.findUnique({
    where: { id: suggestionId },
  });
  if (!suggestion) return null;
  const resume = await prisma.resume.findUnique({
    where: { id: suggestion.resumeId },
  });
  if (!resume || resume.userId !== userId) return null;
  return suggestion;
}
