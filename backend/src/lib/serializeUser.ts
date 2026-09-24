export function serializeUser(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  facultyCode: string | null;
  facultyId: string | null;
  collegeId: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    facultyCode: user.facultyCode,
    facultyId: user.facultyId,
    collegeId: user.collegeId,
  };
}
