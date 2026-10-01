import { useState } from "react";
import { api } from "../../lib/api";
import type { AuthUser } from "../../lib/auth";
import { errorMessage, inputClass } from "../faculty/types";
import { CheckIcon, UserIcon } from "../faculty/icons";
import { CardHeader } from "../faculty/ui";
import { ROLE_LABEL } from "./types";

const MAX_NAME_LENGTH = 80;

export default function DetailsCard({
  user,
  onUserChange,
}: {
  user: AuthUser;
  onUserChange: (user: AuthUser) => void;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const changed = trimmed !== (user.name ?? "");
  const valid = trimmed.length > 0 && trimmed.length <= MAX_NAME_LENGTH;

  async function save() {
    if (!changed || !valid) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { data } = await api.patch<{ user: AuthUser }>("/api/profile", { name: trimmed });
      onUserChange(data.user);
      setName(data.user.name ?? "");
      setNotice("Name updated.");
    } catch (err) {
      setError(errorMessage(err, "Couldn't save your name."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card !p-4 sm:!p-5">
      <CardHeader
        dense
        icon={<UserIcon width={16} height={16} />}
        title="Personal details"
        subtitle="How you appear across Elevate"
      />
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-name" className="text-[13px] font-semibold">
            Full name
          </label>
          <input
            id="profile-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNotice(null);
            }}
            maxLength={MAX_NAME_LENGTH + 20}
            placeholder="Your name"
            autoComplete="name"
            className={inputClass}
          />
          <p className="text-text-2 text-[13px]">
            Shown to your{" "}
            {user.role === "STUDENT"
              ? "faculty"
              : user.role === "FACULTY"
              ? "students and college"
              : "faculty"}
            .
          </p>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-email" className="text-[13px] font-semibold">
              Email
            </label>
            <input
              id="profile-email"
              value={user.email}
              readOnly
              className={`${inputClass} !bg-bg/70 text-text-2`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-role" className="text-[13px] font-semibold">
              Account type
            </label>
            <input
              id="profile-role"
              value={ROLE_LABEL[user.role]}
              readOnly
              className={`${inputClass} !bg-bg/70 text-text-2`}
            />
          </div>
        </div>
        <p className="text-text-2 text-[13px] -mt-1.5">
          Your email is your sign-in, so it can't be changed here.
        </p>

        {error && (
          <p role="alert" className="text-coral text-sm">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="flex items-center gap-1.5 text-teal text-sm">
            <CheckIcon width={14} height={14} /> {notice}
          </p>
        )}

        <div>
          <button
            type="submit"
            className="btn btn-primary btn-small disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={busy || !changed || !valid}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
