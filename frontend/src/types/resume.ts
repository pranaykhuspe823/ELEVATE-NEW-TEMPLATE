export interface ExperienceEntry {
  title: string | null;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
  bullets: string[];
}

export interface EducationEntry {
  institution: string | null;
  degree: string | null;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface ParsedResume {
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    links: string[];
  };
  summary: string | null;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: unknown[];
  certifications: string[];
}

export interface FixSuggestionRecord {
  id: string;
  section: string;
  originalText: string;
  suggestedText: string;
  accepted: boolean;
}
