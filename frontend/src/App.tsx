import { Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import LandingPage from "./pages/LandingPage";
import UploadPage from "./pages/UploadPage";
import AnalysisPage from "./pages/AnalysisPage";
import TestPage from "./pages/TestPage";
import ResultsPage from "./pages/ResultsPage";
import InterviewPage from "./pages/InterviewPage";
import FacultyDashboardPage from "./pages/FacultyDashboardPage";
import FacultyStudentPage from "./pages/FacultyStudentPage";
import MyAssignmentsPage from "./pages/MyAssignmentsPage";
import CollegeRegisterPage from "./pages/CollegeRegisterPage";
import CollegeActivatePage from "./pages/CollegeActivatePage";
import CollegeSubscribePage from "./pages/CollegeSubscribePage";
import CollegeDashboardPage from "./pages/CollegeDashboardPage";
import ProfilePage from "./pages/ProfilePage";
import DrivesPage from "./pages/DrivesPage";
import DriveDetailPage from "./pages/DriveDetailPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppLayout />}>
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/resumes/:resumeId" element={<AnalysisPage />} />
        <Route path="/tests/:testId" element={<TestPage />} />
        <Route path="/tests/:testId/results" element={<ResultsPage />} />
        <Route path="/interviews/:interviewId" element={<InterviewPage />} />
        <Route path="/assignments" element={<MyAssignmentsPage />} />
        <Route path="/drives" element={<DrivesPage />} />
        <Route path="/drives/:id" element={<DriveDetailPage />} />
        <Route path="/faculty" element={<FacultyDashboardPage />} />
        <Route path="/faculty/students/:studentId" element={<FacultyStudentPage />} />
        <Route path="/college/register" element={<CollegeRegisterPage />} />
        <Route path="/college/activate" element={<CollegeActivatePage />} />
        <Route path="/college/subscribe" element={<CollegeSubscribePage />} />
        <Route path="/college" element={<CollegeDashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}

export default App;
