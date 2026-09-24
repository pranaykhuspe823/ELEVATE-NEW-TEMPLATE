import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import AddFacultyCard from "../components/college/AddFacultyCard";
import CollegeHero from "../components/college/CollegeHero";
import CollegeLoginGate from "../components/college/CollegeLoginGate";
import FacultyRoster from "../components/college/FacultyRoster";
import PlanBanner from "../components/college/PlanBanner";
import type {
  Billing,
  CollegeInfo,
  FacultyRow,
  SubscriptionInfo,
} from "../components/college/types";

function PageSkeleton() {
  return (
    <div className="pt-6 animate-pulse" aria-busy="true" aria-label="Loading college">
      <div className="h-[300px] rounded-[22px] bg-card-2" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="h-[280px] rounded-card bg-card-2" />
        <div className="h-[280px] rounded-card bg-card-2" />
      </div>
    </div>
  );
}

export default function CollegeDashboardPage() {
  const { user, loading } = useAuth();
  const [college, setCollege] = useState<CollegeInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [facultyCount, setFacultyCount] = useState(0);
  const [faculty, setFaculty] = useState<FacultyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function load() {
    if (!user || user.role !== "COLLEGE_ADMIN") return;
    Promise.all([
      api.get<{
        college: CollegeInfo;
        subscription: SubscriptionInfo | null;
        billing: Billing;
        facultyCount: number;
      }>("/api/colleges/me"),
      api.get<{ faculty: FacultyRow[] }>("/api/colleges/faculty"),
    ])
      .then(([meRes, facultyRes]) => {
        setCollege(meRes.data.college);
        setSubscription(meRes.data.subscription);
        setBilling(meRes.data.billing);
        setFacultyCount(meRes.data.facultyCount);
        setFaculty(facultyRes.data.faculty);
        setActionError(null);
      })
      .catch(() => setError("Couldn't load your college."));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return null;

  if (!user || user.role !== "COLLEGE_ADMIN") {
    return <CollegeLoginGate />;
  }

  if (error && !college) {
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

  if (!college || !faculty) return <PageSkeleton />;

  return (
    <div className="pt-6">
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

      <CollegeHero
        college={college}
        subscription={subscription}
        facultyCount={facultyCount}
        faculty={faculty}
      />

      {subscription && billing && (
        <PlanBanner subscription={subscription} billing={billing} />
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="lg:col-start-2 lg:row-start-1">
          <AddFacultyCard
            subscription={subscription}
            facultyCount={facultyCount}
            onAdded={load}
          />
        </div>
        <div className="lg:col-start-1 lg:row-start-1 min-w-0">
          <FacultyRoster
            faculty={faculty}
            onChanged={load}
            onError={setActionError}
          />
        </div>
      </div>
    </div>
  );
}
