export interface ProfileData {
  hasPassword: boolean;
  college: {
    id: string;
    name: string;
    domain: string | null;
    adminPhone: string | null;
  } | null;
  faculty: { name: string | null; facultyCode: string | null } | null;
}

export const ROLE_LABEL = {
  STUDENT: "Student",
  FACULTY: "Faculty",
  COLLEGE_ADMIN: "College admin",
} as const;
