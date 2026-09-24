import { useRef, useState } from "react";
import { api } from "../../lib/api";
import { resizeToSquareJpeg } from "../../lib/image";
import type { AuthUser } from "../../lib/auth";
import { errorMessage } from "../faculty/types";
import { CameraIcon, TrashIcon } from "../faculty/icons";
import { Avatar } from "../faculty/ui";
import { ROLE_LABEL } from "./types";

const MAX_PICK_BYTES = 15 * 1024 * 1024;

export default function ProfileHero({
  user,
  onUserChange,
}: {
  user: AuthUser;
  onUserChange: (user: AuthUser) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_PICK_BYTES) {
      setError("That image is too large. Choose one under 15 MB.");
      return;
    }
    setBusy("upload");
    try {
      const blob = await resizeToSquareJpeg(file);
      const form = new FormData();
      form.append("avatar", blob, "avatar.jpg");
      const { data } = await api.post<{ user: AuthUser }>("/api/profile/avatar", form);
      onUserChange(data.user);
    } catch (err) {
      setError(errorMessage(err, "Couldn't use that image. Try a PNG or JPEG."));
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy("remove");
    try {
      const { data } = await api.delete<{ user: AuthUser }>("/api/profile/avatar");
      onUserChange(data.user);
    } catch (err) {
      setError(errorMessage(err, "Couldn't remove your photo."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-lime-dim via-lime to-[#2B4F91] text-white px-5 py-5 sm:px-7 sm:py-6 shadow-[0_14px_32px_-18px_rgba(20,41,79,0.6)]">
      <div className="pointer-events-none absolute -right-20 -top-24 w-72 h-72 rounded-full bg-lime-ink/25 blur-3xl" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="relative flex-none w-[88px] h-[88px]">
          <Avatar name={user.name} email={user.email} url={user.avatarUrl} size={88} />
          <button
            type="button"
            aria-label="Change profile photo"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== null}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white text-lime shadow-md flex items-center justify-center hover:bg-[#F4E8DC] transition disabled:opacity-60"
          >
            <CameraIcon width={15} height={15} />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Profile photo file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#E5B94E]">
            My profile
          </p>
          <h1 className="text-[26px] leading-tight text-white break-words">
            {user.name ?? user.email}
          </h1>
          <p className="text-white/70 text-[13px] break-all mt-0.5">
            {user.email}
            <span className="text-white/40"> · </span>
            {ROLE_LABEL[user.role]}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-small inline-flex items-center gap-1.5 disabled:opacity-60"
            disabled={busy !== null}
            onClick={() => inputRef.current?.click()}
          >
            <CameraIcon width={13} height={13} />
            {busy === "upload" ? "Uploading…" : user.avatarUrl ? "Change photo" : "Upload photo"}
          </button>
          {user.avatarUrl && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3.5 py-2 text-xs text-white/85 hover:bg-white/10 transition disabled:opacity-60"
              disabled={busy !== null}
              onClick={() => void handleRemove()}
            >
              <TrashIcon width={13} height={13} />
              {busy === "remove" ? "Removing…" : "Remove"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="relative mt-3 text-sm text-[#FFB4A2]">
          {error}
        </p>
      )}
    </section>
  );
}
