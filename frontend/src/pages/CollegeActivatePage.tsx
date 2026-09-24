import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import { useAuth, type AuthUser } from "../lib/auth";

export default function CollegeActivatePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [status, setStatus] = useState<"activating" | "error" | "done">("activating");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No activation token in the link.");
      return;
    }
    api
      .post<{ user: AuthUser }>("/api/colleges/activate", { token })
      .then(({ data }) => {
        setUser(data.user);
        setStatus("done");
        navigate("/college/subscribe", { replace: true });
      })
      .catch((err) => {
        setStatus("error");
        setError(
          axios.isAxiosError(err) && err.response?.data?.error
            ? err.response.data.error
            : "Couldn't activate your account."
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === "activating") {
    return (
      <div className="pt-10">
        <p className="text-text-2 text-sm">Activating your account…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="pt-10 max-w-[480px]">
        <p className="eyebrow">Activation</p>
        <h1 className="text-[28px] mb-3">Couldn't activate</h1>
        <p className="text-coral text-sm mb-4" role="alert">
          {error}
        </p>
        <Link to="/college/register" className="btn btn-primary w-fit">
          Register again
        </Link>
      </div>
    );
  }

  return null;
}
