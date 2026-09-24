export interface ExternalPlagiarismResult {
  similarityScore: number;
  matchedUrl: string;
  explanation: string;
}

/**
 * Stub for a future web-plagiarism provider (Copyleaks, Originality.ai, etc.)
 * -- no API keys are provisioned yet. Returns null until real integration is
 * wired in; callers should treat null as "no web check was performed", not
 * "no plagiarism found".
 */
export async function checkExternalPlagiarism(
  _normalizedText: string
): Promise<ExternalPlagiarismResult | null> {
  // TODO: call Copyleaks/Originality.ai (or similar) once API keys exist, and
  // store results with source: "web" on PlagiarismCheck.
  return null;
}
