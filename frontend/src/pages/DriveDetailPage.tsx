import { useAuth } from "../lib/auth";
import StaffDriveDetail from "../components/drives/StaffDriveDetail";
import StudentDriveDetail from "../components/drives/StudentDriveDetail";

export default function DriveDetailPage() {
  const { user, loading } = useAuth();
  // Signed-out visitors are sent to the landing page by AppLayout.
  if (loading || !user) return null;
  if (user.role === "STUDENT") return <StudentDriveDetail />;
  return <StaffDriveDetail role={user.role} />;
}
