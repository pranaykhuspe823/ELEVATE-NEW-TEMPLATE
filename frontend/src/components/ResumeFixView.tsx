import type { FixSuggestionRecord, ParsedResume } from "../types/resume";

interface Props {
  resume: ParsedResume;
  suggestions: FixSuggestionRecord[];
}

function dateRange(start: string | null, end: string | null): string {
  return [start, end].filter(Boolean).join(" – ");
}

export default function ResumeFixView({ resume, suggestions }: Props) {
  const suggestionByBullet = new Map(
    suggestions.map((s) => [s.originalText.trim(), s])
  );

  return (
    <div className="grid grid-cols-2 gap-x-6 text-sm">
      <div className="col-span-2 flex justify-between text-[11px] font-mono text-text-3 uppercase tracking-wide pb-2 border-b border-border mb-3">
        <span>Your resume</span>
        <span>Suggested fix</span>
      </div>

      <div className="col-span-2 pb-3 border-b border-border mb-3">
        <div className="font-display font-medium text-base">
          {resume.contact.name ?? "Unnamed candidate"}
        </div>
        <div className="text-text-3 text-xs mt-1">
          {[resume.contact.email, resume.contact.phone, resume.contact.location]
            .filter(Boolean)
            .join(" · ") || "No contact info detected"}
        </div>
      </div>

      {resume.summary && (
        <div className="col-span-2 text-text-2 mb-3">{resume.summary}</div>
      )}

      {resume.skills.length > 0 && (
        <div className="col-span-2 mb-3">
          {resume.skills.map((skill) => (
            <span className="tag" key={skill}>
              {skill}
            </span>
          ))}
        </div>
      )}

      {resume.experience.map((exp, expIdx) => (
        <div className="col-span-2" key={expIdx}>
          <div className="mt-2 mb-1.5">
            <span className="font-medium">
              {exp.title ?? "Role"}
              {exp.company ? ` at ${exp.company}` : ""}
            </span>
            <span className="text-text-3 text-[11px] font-mono ml-2">
              {dateRange(exp.startDate, exp.endDate)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {exp.bullets.map((bullet, bIdx) => {
              const suggestion = suggestionByBullet.get(bullet.trim());

              if (!suggestion) {
                return (
                  <div
                    key={bIdx}
                    className="col-span-2 text-text-2 pl-3.5 relative before:content-['•'] before:absolute before:left-0 before:text-text-3"
                  >
                    {bullet}
                  </div>
                );
              }

              return (
                <div key={bIdx} className="contents">
                  <div className="pl-3.5 relative before:content-['•'] before:absolute before:left-0 before:text-text-3 text-text-2 underline decoration-coral decoration-2 underline-offset-4 bg-coral/5 rounded-md py-1">
                    {bullet}
                  </div>
                  <div>
                    <div className="text-lime-ink bg-lime/5 rounded-md py-1">
                      {suggestion.suggestedText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {resume.education.length > 0 && (
        <div className="col-span-2 mt-3">
          <p className="eyebrow">Education</p>
          {resume.education.map((edu, i) => (
            <div key={i} className="text-text-2 text-xs mb-1">
              {edu.degree ? `${edu.degree}, ` : ""}
              {edu.institution ?? "Unknown institution"}
              {edu.startDate || edu.endDate
                ? ` (${dateRange(edu.startDate, edu.endDate)})`
                : ""}
            </div>
          ))}
        </div>
      )}

      {resume.certifications.length > 0 && (
        <div className="col-span-2 mt-2">
          <p className="eyebrow">Certifications</p>
          <div className="text-text-2 text-xs">
            {resume.certifications.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}
