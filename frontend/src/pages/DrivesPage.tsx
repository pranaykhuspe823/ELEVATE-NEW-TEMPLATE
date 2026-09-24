import { useAuth } from "../lib/auth";
import StaffDrives from "../components/drives/StaffDrives";
import StudentDrives from "../components/drives/StudentDrives";

export default function DrivesPage() {
  const { user, loading } = useAuth();
  // Signed-out visitors are sent to the landing page by AppLayout.
  if (loading || !user) return null;
  if (user.role === "STUDENT") return <StudentDrives />;
  return <StaffDrives role={user.role} />;
}
