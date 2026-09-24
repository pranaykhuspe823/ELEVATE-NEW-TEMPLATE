import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import PlanLocked from "../components/faculty/PlanLocked";
import AssignedCourses from "../components/faculty/AssignedCourses";
import CourseFinder from "../components/faculty/CourseFinder";
import IntegrityCard from "../components/faculty/IntegrityCard";
import PlagiarismReviewSection from "../components/faculty/PlagiarismReviewSection";
import StudentDriveFits from "../components/drives/StudentDriveFits";
import StudentHero from "../components/faculty/StudentHero";
import WeakTopicsCard from "../components/faculty/WeakTopicsCard";
import { ArrowLeftIcon } from "../components/faculty/icons";
import {
  firstName,
  type PlagiarismMatch,
  type StudentDetail,
} from "../components/faculty/types";

function BackLink() {
  return (
    <Link
      to="/faculty"
      className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-lime transition mb-3"
    >
      <ArrowLeftIcon width={15} height={15} /> All students
    </Link>
  );
}

function PageSkeleton() {
  return (
    <div className="pt-4 animate-pulse" aria-busy="true" aria-label="Loading student">
      <div className="h-4 w-28 rounded bg-card-2 mb-3" />
      <div className="h-[130px] rounded-[20px] bg-card-2" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="h-[340px] rounded-card bg-card-2" />
        <div className="flex flex-col gap-4">
          <div className="h-[150px] rounded-card bg-card-2" />
          <div className="h-[200px] rounded-card bg-card-2" />
        </div>
      </div>
    </div>
  );
}

export default function FacultyStudentPage() {
  const { studentId } = useParams();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [matches, setMatches] = useState<PlagiarismMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [finderRequest, setFinderRequest] = useState<{
    query: string;
    nonce: number;
  } | null>(null);

  function load() {
    Promise.all([
      api.get<StudentDetail>(`/api/faculty/students/${studentId}`),
      api.get<{ matches: PlagiarismMatch[] }>(
        `/api/faculty/students/${studentId}/plagiarism`
      ),
    ])
      .then(([detailRes, plagiarismRes]) => {
        setDetail(detailRes.data);
        setMatches(plagiarismRes.data.matches);
        setActionError(null);
      })
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 402) {
          setLocked(
            err.response.data?.error ?? "Your college's plan has expired."
          );
        } else {
          setError("Couldn't load this student — they may not be linked to you.");
        }
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const suggestedSearches = useMemo(() => {
    if (!detail) return [];
    const topics = [
      ...detail.weakTopics.map((t) => t.topic),
      ...detail.facultyWeakTopics.map((t) => t.topic),
    ];
    return Array.from(new Set(topics)).slice(0, 6);
  }, [detail]);

  function findCourseFor(topic: string) {
    setFinderRequest({ query: topic, nonce: Date.now() });
    document
      .getElementById("course-finder")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (locked) return <PlanLocked message={locked} />;

  if (error) {
    return (
      <div className="pt-4">
        <BackLink />
        <div className="card border-coral/30 bg-coral/5">
          <p className="text-coral text-sm" role="alert">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!detail) return <PageSkeleton />;

  const student = detail.student;
  const name = firstName(student.name, student.email);
  const openFlags = matches.filter((m) => m.reviewStatus !== "cleared").length;
  const assignedTopics = new Set(detail.assignments.map((a) => a.topic));

  return (
    <div className="pt-4">
      <BackLink />

      {actionError && (
        <div
          role="alert"
          className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-coral/30 bg-coral/5 px-4 py-3"
        >
          <p className="text-coral text-sm">{actionError}</p>
          <button
            type="button"
            className="text-coral/70 hover:text-coral text-xs flex-none"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <StudentHero detail={detail} openFlags={openFlags} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <CourseFinder
            studentId={student.id}
            studentFirstName={name}
            suggestedSearches={suggestedSearches}
            aiModules={detail.suggestedModules}
            request={finderRequest}
            onAssigned={load}
            onError={setActionError}
          />
          <IntegrityCard
            score={detail.plagiarismScore}
            threshold={detail.plagiarismThreshold}
            openFlags={openFlags}
            totalMatches={matches.length}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <StudentDriveFits
            studentId={student.id}
            studentFirstName={name}
            onFindCourse={findCourseFor}
          />
          <WeakTopicsCard
            studentId={student.id}
            weakTopics={detail.weakTopics}
            facultyTopics={detail.facultyWeakTopics}
            assignedTopics={assignedTopics}
            onChanged={load}
            onError={setActionError}
            onFindCourse={findCourseFor}
          />
          <AssignedCourses
            assignments={detail.assignments}
            onChanged={load}
            onError={setActionError}
          />
        </aside>
      </div>

      {matches.length > 0 && (
        <div className="mt-4">
          <PlagiarismReviewSection
            matches={matches}
            onChanged={load}
            onError={setActionError}
          />
        </div>
      )}
    </div>
  );
}
