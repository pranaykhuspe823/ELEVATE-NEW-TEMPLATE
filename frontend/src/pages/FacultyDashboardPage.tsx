import { useEffect, useState } from "react";
import axios from "axios";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import FacultyLoginGate from "../components/faculty/FacultyLoginGate";
import PlanLocked from "../components/faculty/PlanLocked";
import Roster, { type RosterStudent } from "../components/faculty/Roster";

function RosterSkeleton() {
  return (
    <div className="pt-6 animate-pulse" aria-busy="true" aria-label="Loading students">
      <div className="h-10 w-64 rounded bg-card-2 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[112px] rounded-card bg-card-2" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[190px] rounded-card bg-card-2" />
        ))}
      </div>
    </div>
  );
}

export default function FacultyDashboardPage() {
  const { user, loading } = useAuth();
  const [facultyCode, setFacultyCode] = useState<string | null>(null);
  const [students, setStudents] = useState<RosterStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "FACULTY") return;
    let cancelled = false;
    Promise.all([
      api.get<{ facultyCode: string | null }>("/api/faculty/me"),
      api.get<{ students: RosterStudent[] }>("/api/faculty/students"),
    ])
      .then(([meRes, studentsRes]) => {
        if (cancelled) return;
        setFacultyCode(meRes.data.facultyCode);
        setStudents(studentsRes.data.students);
      })
      .catch((err) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 402) {
          setLocked(
            err.response.data?.error ?? "Your college's plan has expired."
          );
        } else {
          setError("Couldn't load your students.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return null;

  if (!user || user.role !== "FACULTY") {
    return <FacultyLoginGate />;
  }

  if (locked) return <PlanLocked message={locked} />;

  if (error) {
    return (
      <div className="pt-6">
        <div className="card border-coral/30 bg-coral/5">
          <p className="text-coral text-sm" role="alert">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!students) return <RosterSkeleton />;

  return <Roster students={students} facultyCode={facultyCode} />;
}
