import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { uploadResume } from "../lib/api";
import FacultyLinkCard from "../components/FacultyLinkCard";
import {
  BookIcon,
  FileIcon,
  SearchIcon,
  SparkIcon,
  TargetIcon,
  UploadIcon,
} from "../components/faculty/icons";

const ALLOWED_EXTENSIONS = [".pdf", ".docx"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const OUTCOMES: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <TargetIcon width={18} height={18} />,
    title: "A real ATS score",
    body: "See how applicant-tracking systems read your resume, out of 100.",
  },
  {
    icon: <SearchIcon width={18} height={18} />,
    title: "Your field match",
    body: "Which role and seniority your resume actually points to.",
  },
  {
    icon: <BookIcon width={18} height={18} />,
    title: "A skill test from your resume",
    body: "Questions built from the skills and projects you listed.",
  },
  {
    icon: <SparkIcon width={18} height={18} />,
    title: "A plan to close the gaps",
    body: "Fix suggestions and courses aimed at what's missing.",
  },
];

function validateFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );
  if (!hasAllowedExtension) {
    return "Only PDF or DOCX files are supported.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "File exceeds the 10MB limit.";
  }
  return null;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setFileName(file.name);
    setIsUploading(true);
    try {
      const { resumeId } = await uploadResume(file);
      navigate(`/resumes/${resumeId}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.error ??
            "Couldn't reach the server. Is the backend running?"
        );
      } else {
        setError("Upload failed. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    // Dropping a file just outside the box would otherwise make the browser
    // navigate away to open it, so swallow stray drops page-wide.
    <div
      className="pt-6 pb-2"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <div className="grid gap-8 lg:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] items-start">
        <div className="lg:pt-6">
          <p className="eyebrow">Resume intelligence</p>
          <h1 className="text-[34px] sm:text-[42px] font-bold leading-[1.1] mb-4">
            Find out what your
            <br />
            resume <span className="text-lime-ink">actually says.</span>
          </h1>
          <p className="text-text-2 text-[15px] leading-relaxed max-w-[520px] mb-7">
            Upload once. Get a real ATS score, a field match, a skill test built
            from your own resume, and a plan to close the gaps.
          </p>

          <ul className="grid gap-3.5 sm:grid-cols-2 max-w-[640px]">
            {OUTCOMES.map((o) => (
              <li key={o.title} className="flex items-start gap-3">
                <span className="flex-none w-9 h-9 rounded-xl bg-lime/10 text-lime flex items-center justify-center">
                  {o.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold leading-snug">{o.title}</p>
                  <p className="text-text-2 text-[13px] leading-snug mt-0.5">{o.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!isUploading) setIsDragActive(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setIsDragActive(false);
              }
            }}
            onDrop={handleDrop}
            aria-busy={isUploading}
            className={`rounded-[22px] border-2 border-dashed px-6 py-10 sm:px-10 sm:py-12 text-center transition ${
              isDragActive
                ? "border-lime bg-lime/5 shadow"
                : "border-border bg-white hover:border-lime"
            }`}
          >
            <div
              className={`w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center transition ${
                isDragActive ? "bg-lime text-white" : "bg-lime/10 text-lime"
              }`}
            >
              {isUploading ? (
                <span
                  className="w-6 h-6 rounded-full border-[3px] border-lime/25 border-t-lime animate-spin"
                  aria-hidden="true"
                />
              ) : isDragActive ? (
                <FileIcon width={26} height={26} />
              ) : (
                <UploadIcon width={26} height={26} />
              )}
            </div>

            <h2 className="text-[19px] leading-snug mb-1.5 break-words">
              {isUploading
                ? `Uploading${fileName ? ` ${fileName}` : ""}…`
                : isDragActive
                ? "Drop it to upload"
                : "Drop your resume here"}
            </h2>
            <p className="text-text-2 text-[13px] mb-5">
              {isUploading
                ? "This only takes a moment."
                : "PDF or DOCX, up to 10MB"}
            </p>

            {!isUploading && (
              <>
                <div className="flex items-center gap-3 max-w-[220px] mx-auto mb-5 text-text-3 text-xs">
                  <span className="flex-1 h-px bg-border" />
                  or
                  <span className="flex-1 h-px bg-border" />
                </div>
                <button
                  type="button"
                  className="btn btn-primary !px-7 !py-3 inline-flex items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileIcon width={16} height={16} />
                  Browse files
                </button>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              aria-label="Resume file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral"
            >
              {error}
            </div>
          )}

          <p className="text-text-2 text-[13px] text-center">
            After you upload, the analysis usually takes a minute or two.
          </p>

          <FacultyLinkCard />
        </div>
      </div>
    </div>
  );
}
