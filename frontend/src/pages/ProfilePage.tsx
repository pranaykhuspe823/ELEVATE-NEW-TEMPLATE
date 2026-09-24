import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import AccountCard from "../components/profile/AccountCard";
import CollegeCard from "../components/profile/CollegeCard";
import DetailsCard from "../components/profile/DetailsCard";
import PasswordCard from "../components/profile/PasswordCard";
import ProfileHero from "../components/profile/ProfileHero";
import type { ProfileData } from "../components/profile/types";

function PageSkeleton() {
  return (
    <div className="pt-4 animate-pulse" aria-busy="true" aria-label="Loading profile">
      <div className="h-[130px] rounded-[20px] bg-card-2" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-[300px] rounded-card bg-card-2" />
        <div className="h-[220px] rounded-card bg-card-2" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .get<ProfileData>("/api/profile")
      .then(({ data }) => setProfile(data))
      .catch(() => setError("Couldn't load your profile."));
    // Load once per signed-in account; edits update local state directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;

  if (error) {
    return (
      <div className="pt-4">
        <div className="card border-coral/30 bg-coral/5">
          <p className="text-coral text-sm" role="alert">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!profile) return <PageSkeleton />;

  return (
    <div className="pt-4">
      <ProfileHero user={user} onUserChange={setUser} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <DetailsCard user={user} onUserChange={setUser} />
          {user.role === "COLLEGE_ADMIN" && profile.college && (
            <CollegeCard
              college={profile.college}
              onSaved={(college) => setProfile({ ...profile, college })}
            />
          )}
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          <AccountCard user={user} profile={profile} />
          {profile.hasPassword && <PasswordCard />}
        </div>
      </div>
    </div>
  );
}
