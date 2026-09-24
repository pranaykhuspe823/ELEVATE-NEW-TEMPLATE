import { useState } from "react";
import { api } from "../../lib/api";
import { errorMessage, inputClass } from "../faculty/types";
import { BuildingIcon, CheckIcon } from "../faculty/icons";
import { CardHeader } from "../faculty/ui";
import type { ProfileData } from "./types";

type College = NonNullable<ProfileData["college"]>;

export default function CollegeCard({
  college,
  onSaved,
}: {
  college: College;
  onSaved: (college: College) => void;
}) {
  const [name, setName] = useState(college.name);
  const [domain, setDomain] = useState(college.domain ?? "");
  const [phone, setPhone] = useState(college.adminPhone ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changed =
    name.trim() !== college.name ||
    domain.trim() !== (college.domain ?? "") ||
    phone.trim() !== (college.adminPhone ?? "");

  async function save() {
    if (!changed || !name.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { data } = await api.patch<{ college: College }>("/api/profile/college", {
        name,
        domain,
        adminPhone: phone,
      });
      onSaved(data.college);
      setName(data.college.name);
      setDomain(data.college.domain ?? "");
      setPhone(data.college.adminPhone ?? "");
      setNotice("College details updated.");
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the college details."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card !p-4 sm:!p-5 shadow-[0_1px_2px_rgba(31,41,55,0.04)]">
      <CardHeader
        dense
        icon={<BuildingIcon width={16} height={16} />}
        title="College details"
        subtitle="Your placement cell's public details"
      />
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="college-name" className="text-[13px] font-semibold">
            College name
          </label>
          <input
            id="college-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNotice(null);
            }}
            autoComplete="organization"
            className={inputClass}
          />
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="college-domain" className="text-[13px] font-semibold">
              Website domain <span className="text-text-2 font-normal">· optional</span>
            </label>
            <input
              id="college-domain"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setNotice(null);
              }}
              placeholder="e.g. abc.edu.in"
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="college-phone" className="text-[13px] font-semibold">
              Contact number <span className="text-text-2 font-normal">· optional</span>
            </label>
            <input
              id="college-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setNotice(null);
              }}
              placeholder="e.g. 98765 43210"
              autoComplete="tel"
              className={inputClass}
            />
          </div>
        </div>

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
            disabled={busy || !changed || !name.trim()}
          >
            {busy ? "Saving…" : "Save college details"}
          </button>
        </div>
      </form>
    </section>
  );
}
