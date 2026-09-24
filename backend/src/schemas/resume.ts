import { z } from "zod";

export const ResumeSchema = z.object({
  contact: z.object({
    name: z.string().nullable().default(null),
    email: z.string().nullable().default(null),
    phone: z.string().nullable().default(null),
    location: z.string().nullable().default(null),
    links: z.array(z.string()).default([]),
  }),
  summary: z.string().nullable().default(null),
  skills: z.array(z.string()).default([]),
  experience: z
    .array(
      z.object({
        title: z.string().nullable().default(null),
        company: z.string().nullable().default(null),
        startDate: z.string().nullable().default(null),
        endDate: z.string().nullable().default(null),
        bullets: z.array(z.string()).default([]),
      })
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string().nullable().default(null),
        degree: z.string().nullable().default(null),
        field: z.string().nullable().default(null),
        startDate: z.string().nullable().default(null),
        endDate: z.string().nullable().default(null),
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string().nullable().default(null),
        description: z.string().nullable().default(null),
        technologies: z.array(z.string()).default([]),
      })
    )
    .default([]),
  certifications: z.array(z.string()).default([]),
});

export type ParsedResume = z.infer<typeof ResumeSchema>;

export const RESUME_JSON_SCHEMA_DESCRIPTION = `{
  "contact": {"name": string|null, "email": string|null, "phone": string|null, "location": string|null, "links": string[]},
  "summary": string|null,
  "skills": string[],
  "experience": [{"title": string|null, "company": string|null, "startDate": string|null, "endDate": string|null, "bullets": string[]}],
  "education": [{"institution": string|null, "degree": string|null, "field": string|null, "startDate": string|null, "endDate": string|null}],
  "projects": [{"name": string|null, "description": string|null, "technologies": string[]}],
  "certifications": string[]
}`;
