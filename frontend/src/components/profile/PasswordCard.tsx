import { useState } from "react";
import { api } from "../../lib/api";
import { errorMessage, inputClass } from "../faculty/types";
import { CheckIcon, EyeIcon, EyeOffIcon, KeyIcon } from "../faculty/icons";
import { CardHeader } from "../faculty/ui";

const MIN_PASSWORD_LENGTH = 8;

export default function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const longEnough = next.length >= MIN_PASSWORD_LENGTH;
  const matches = next !== "" && next === confirm;
  const canSubmit = !busy && current !== "" && longEnough && matches;

  async function save() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.post("/api/profile/password", {
        currentPassword: current,
        newPassword: next,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setNotice("Password changed. Use it next time you sign in.");
    } catch (err) {
      setError(errorMessage(err, "Couldn't change your password."));
    } finally {
      setBusy(false);
    }
  }

  const type = show ? "text" : "password";

  return (
    <section className="card !p-4 sm:!p-5 shadow-[0_1px_2px_rgba(31,41,55,0.04)]">
      <CardHeader
        dense
        icon={<KeyIcon width={16} height={16} />}
        title="Password"
        subtitle="Change the password you sign in with"
        right={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            className="inline-flex items-center gap-1.5 text-xs text-text-2 hover:text-lime transition"
          >
            {show ? <EyeOffIcon width={14} height={14} /> : <EyeIcon width={14} height={14} />}
            {show ? "Hide" : "Show"}
          </button>
        }
      />
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pw-current" className="text-[13px] font-semibold">
            Current password
          </label>
          <input
            id="pw-current"
            type={type}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw-new" className="text-[13px] font-semibold">
              New password
            </label>
            <input
              id="pw-new"
              type={type}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw-confirm" className="text-[13px] font-semibold">
              Confirm new password
            </label>
            <input
              id="pw-confirm"
              type={type}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </div>

        <ul className="flex flex-col gap-1 text-[13px]">
          <li className={`flex items-center gap-1.5 ${longEnough ? "text-teal font-medium" : "text-text-2"}`}>
            <CheckIcon width={12} height={12} /> At least {MIN_PASSWORD_LENGTH} characters
          </li>
          <li className={`flex items-center gap-1.5 ${matches ? "text-teal font-medium" : "text-text-2"}`}>
            <CheckIcon width={12} height={12} /> Both new passwords match
          </li>
        </ul>

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
            disabled={!canSubmit}
          >
            {busy ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}
