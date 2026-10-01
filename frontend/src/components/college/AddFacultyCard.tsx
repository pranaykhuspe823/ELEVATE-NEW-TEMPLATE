import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { errorMessage, inputClass } from "../faculty/types";
import { CheckIcon, PlusIcon, UsersIcon } from "../faculty/icons";
import { CardHeader } from "../faculty/ui";
import type { SubscriptionInfo } from "./types";

export default function AddFacultyCard({
  subscription,
  facultyCount,
  onAdded,
}: {
  subscription: SubscriptionInfo | null;
  facultyCount: number;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const canAdd = subscription?.canAddFaculty ?? false;
  const seats = subscription?.facultySeats ?? 0;
  const seatsFull = !!subscription && facultyCount >= seats;

  async function handleAdd() {
    if (!email.trim()) return;
    setIsAdding(true);
    setError(null);
    setNotice(null);
    try {
      await api.post("/api/colleges/faculty", {
        email: email.trim(),
        name: name.trim() || undefined,
      });
      setNotice(`Added ${name.trim() || email.trim()}.`);
      setEmail("");
      setName("");
      onAdded();
    } catch (err) {
      setError(errorMessage(err, "Couldn't add that faculty member."));
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <section className="card">
      <CardHeader
        icon={<PlusIcon width={18} height={18} />}
        title="Add faculty"
        subtitle="Give a colleague access to their students"
      />

      {subscription && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-[13px] mb-2">
            <span className="font-medium">Seats used</span>
            <span className="text-text-2">
              {facultyCount} of {seats}
            </span>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: seats }).map((_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < facultyCount ? "bg-lime" : "bg-card-2"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {!canAdd ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg/60 px-4 py-5 text-center">
          <p className="text-text-2 text-sm leading-relaxed">
            {subscription
              ? "Your plan has expired. Activate the paid plan to add faculty again."
              : "Start your free trial to begin adding faculty."}
          </p>
          <Link
            to="/college/subscribe"
            className="btn btn-primary btn-small inline-block mt-3 no-underline"
          >
            {subscription ? "Activate paid plan" : "Start free trial"}
          </Link>
        </div>
      ) : seatsFull ? (
        <div className="rounded-2xl border border-amber/30 bg-amber/5 px-4 py-5 text-center">
          <p className="text-sm leading-relaxed">
            All <strong>{seats}</strong> faculty seats are in use.
          </p>
          <Link
            to="/college/subscribe"
            className="btn btn-primary btn-small inline-block mt-3 no-underline"
          >
            Upgrade your plan
          </Link>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleAdd();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fac-name" className="text-[13px] font-semibold">
              Name <span className="text-text-2 font-normal">· optional</span>
            </label>
            <input
              id="fac-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Meera Sharma"
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fac-email" className="text-[13px] font-semibold">
              Faculty email
            </label>
            <input
              id="fac-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@college.edu.in"
              autoComplete="off"
              className={inputClass}
              required
            />
          </div>
          <p className="flex items-start gap-2 text-[13px] text-text-2 leading-relaxed">
            <UsersIcon width={15} height={15} className="flex-none mt-0.5" />
            They sign in on the Faculty page with this email and set their own
            password — no invite code needed.
          </p>
          <button
            type="submit"
            className="btn btn-primary !py-3 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isAdding || !email.trim()}
          >
            {isAdding ? "Adding…" : "Add faculty"}
          </button>
        </form>
      )}

      {notice && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2.5 rounded-xl border border-teal/30 bg-teal/10 px-4 py-2.5 text-sm text-teal"
        >
          <CheckIcon width={16} height={16} className="flex-none" />
          <span className="min-w-0 break-words">{notice}</span>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral"
        >
          {error}
        </div>
      )}
    </section>
  );
}
