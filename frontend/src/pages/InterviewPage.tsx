import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import PlatformIcon from "../components/PlatformIcon";
import { buildCourseResources } from "../lib/courseResources";
import { generateInterviewReportPdf } from "../lib/generateInterviewReportPdf";

interface TranscriptTurn {
  role: "interviewer" | "candidate";
  text: string;
}

interface Feedback {
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
}

interface InterviewRecord {
  id: string;
  resumeId: string;
  status: "in_progress" | "completed";
  transcript: TranscriptTurn[];
  overallScore: number | null;
  communicationScore: number | null;
  technicalDepthScore: number | null;
  resumeConsistencyScore: number | null;
  confidenceScore: number | null;
  feedback: Feedback | null;
  recommendation: string | null;
  recommendationReason: string | null;
  detailedFeedback: string | null;
}

const RECOMMENDATION_STYLES: Record<string, string> = {
  "Strong Hire": "bg-teal/10 text-teal",
  Hire: "bg-teal/10 text-teal",
  "Lean Hire": "bg-amber/10 text-amber",
  "No Hire": "bg-red/10 text-red",
};

function ScoreTile({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="flex-1 card">
      <p className="eyebrow">{label}</p>
      <h2 className="text-[28px] font-display font-bold">
        {score !== null ? Math.round(score) : "—"}
        <span className="text-sm text-text-3">/100</span>
      </h2>
    </div>
  );
}

// The best known human-sounding female voice names across ecosystems,
// ranked highest-quality first. This isn't tied to any one browser -- on
// any given machine, whichever of these actually exists in
// speechSynthesis.getVoices() wins; the rest are simply absent there and
// skipped. Edge (any OS) exposes genuinely neural "Online (Natural)"
// voices for free; macOS/Safari have higher-quality "Enhanced"/"Premium"
// tiers of some named voices; Chrome's Google-branded voices are a step up
// from raw OS text-to-speech but not neural.
const PREMIUM_FEMALE_VOICE_NAMES = [
  "online (natural)", // matches any Microsoft "<Name> Online (Natural)" neural voice, regardless of which name Windows/Edge installed
  "premium",
  "enhanced",
  "google uk english female",
  "google english female",
];

/** Picks the most human-sounding FEMALE voice available in this browser.
 * Voice quality/availability varies a lot by OS and browser -- there's no
 * API to ask "which voice sounds most human", so this checks a ranked list
 * of known high-quality voice names first, then falls back to generic
 * female-name heuristics if none of those exist here. */
function pickFemaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;

  const femalePattern =
    /female|zira|jenny|aria|samantha|susan|karen|victoria|moira|tessa|fiona|kate|serena|allison|ava|salli|joanna|emma|libby|hazel|sonia|shelley|nicky|zoe|natasha/i;
  const malePattern = /male|david|mark|guy|daniel|george|james|fred|alex(?!a)/i;

  const femalePool = pool.filter((v) => femalePattern.test(v.name) && !malePattern.test(v.name));

  // Premium/neural names checked in priority order, restricted to voices
  // that also look female by name -- so we never accidentally pick a
  // high-quality MALE voice just because it matches "online (natural)".
  for (const premiumName of PREMIUM_FEMALE_VOICE_NAMES) {
    const match = femalePool.find((v) => v.name.toLowerCase().includes(premiumName));
    if (match) return match;
  }

  const qualityRank = (v: SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    if (/neural|natural|online/.test(name)) return 3;
    if (!v.localService) return 2;
    return 1;
  };

  // Optional per-environment override (e.g. VITE_INTERVIEW_VOICE_NAME_HINT
  // = "Aria,Jenny") so a specific machine/browser's best voice can be
  // preferred without a code change -- checked ahead of the generic
  // fallback below (but the premium-name list above still wins if present,
  // since it's a stronger, curated signal).
  const hint = import.meta.env.VITE_INTERVIEW_VOICE_NAME_HINT as string | undefined;
  if (hint) {
    const hintNames = hint
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    const hintCandidates = pool.filter((v) =>
      hintNames.some((h) => v.name.toLowerCase().includes(h))
    );
    if (hintCandidates.length > 0) {
      return [...hintCandidates].sort((a, b) => qualityRank(b) - qualityRank(a))[0];
    }
  }

  const candidates = femalePool.length > 0 ? femalePool : pool;
  return [...candidates].sort((a, b) => qualityRank(b) - qualityRank(a))[0] ?? null;
}

/** Voices `text` aloud and toggles the AI avatar's "speaking" animation in
 * sync via the utterance's own start/end events -- there's no <audio>
 * element here since TTS is done via the browser's native speechSynthesis
 * (no server-side voice bytes), so these events are the equivalent hook.
 *
 * Chrome (and some other browsers) load the voice list asynchronously; a
 * speak() call made before that list is populated can fail completely and
 * silently (no error, no onerror, nothing spoken). Wait for "voiceschanged"
 * on first use, with a timeout fallback for browsers that never fire it. */
function speak(text: string, onStart: () => void, onEnd: () => void) {
  if (!("speechSynthesis" in window)) {
    onEnd();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.98;
  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;

  let hasSpoken = false;
  const doSpeak = () => {
    if (hasSpoken) return;
    hasSpoken = true;
    const voice = pickFemaleVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    synth.speak(utterance);
  };

  if (synth.getVoices().length > 0) {
    doSpeak();
  } else {
    synth.addEventListener("voiceschanged", doSpeak, { once: true });
    setTimeout(doSpeak, 300);
  }
}

function pickSupportedMimeType(candidates: string[]): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export default function InterviewPage() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<InterviewRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [isEnding, setIsEnding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Live video-call session state -- gated behind an explicit "Start
  // Interview" click (rather than arming media the instant the page loads)
  // so the permission prompt is a clear, expected user action.
  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [isRequestingMedia, setIsRequestingMedia] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const [mediaErrorMessage, setMediaErrorMessage] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [sessionRecordingUrl, setSessionRecordingUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // The single camera+mic stream for the whole session, shared by the self
  // -view tile, the continuous session recorder, and (as a derived
  // audio-only sub-stream) each per-turn recorder -- so only ONE
  // getUserMedia permission prompt is ever shown.
  const sessionStreamRef = useRef<MediaStream | null>(null);
  const sessionRecorderRef = useRef<MediaRecorder | null>(null);
  const sessionChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<InterviewRecord>(`/api/interviews/${interviewId}`)
      .then(({ data }) => {
        if (cancelled) return;
        setInterview(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load this interview.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
      window.speechSynthesis?.cancel();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      if (sessionRecorderRef.current && sessionRecorderRef.current.state !== "inactive") {
        sessionRecorderRef.current.stop();
      }
      sessionStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [interviewId]);

  // Runs after the live-call view (and its <video> element) has actually
  // mounted, which is the earliest point videoRef.current is non-null.
  useEffect(() => {
    if (hasStartedSession && !isAudioOnly && videoRef.current && sessionStreamRef.current) {
      videoRef.current.srcObject = sessionStreamRef.current;
    }
  }, [hasStartedSession, isAudioOnly]);

  async function refreshInterview() {
    const { data } = await api.get<InterviewRecord>(`/api/interviews/${interviewId}`);
    setInterview(data);
    return data;
  }

  function handleStartRecording() {
    setTurnError(null);
    const audioTracks = sessionStreamRef.current?.getAudioTracks() ?? [];
    if (audioTracks.length === 0) {
      setTurnError("No microphone available. Use the text fallback below.");
      return;
    }

    // A derived stream over the SAME shared audio track(s) -- not a new
    // getUserMedia call -- so no second permission prompt.
    const audioStream = new MediaStream(audioTracks);
    const mimeType = pickSupportedMimeType(["audio/webm;codecs=opus", "audio/webm"]);
    const recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      if (blob.size > 0) {
        const formData = new FormData();
        formData.append("audio", blob, "answer.webm");
        submitTurn(formData);
      }
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  }

  function handleStopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }

  async function handleStartSession() {
    setMediaErrorMessage(null);
    setIsRequestingMedia(true);

    let stream: MediaStream | null = null;
    let audioOnly = false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioOnly = true;
        setMediaErrorMessage("Camera unavailable — audio-only mode.");
      } catch {
        setMediaErrorMessage(
          "Camera and microphone unavailable — use the text answer fallback below."
        );
      }
    }

    sessionStreamRef.current = stream;
    setIsAudioOnly(audioOnly);
    setHasAudioTrack(!!stream && stream.getAudioTracks().length > 0);

    // NOTE: don't try to attach `stream` to videoRef here -- the <video>
    // element doesn't exist yet (we're still rendering the pre-start screen
    // at this point in the function; it only mounts after
    // setHasStartedSession(true) below causes a re-render). The attach
    // happens in the useEffect keyed on hasStartedSession instead.

    if (stream) {
      const mimeType = pickSupportedMimeType(
        audioOnly
          ? ["audio/webm;codecs=opus", "audio/webm"]
          : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      sessionChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) sessionChunksRef.current.push(e.data);
      };
      sessionRecorderRef.current = recorder;
      // Collect in 1s chunks rather than one giant blob at stop-time, so a
      // crash/refresh mid-interview doesn't lose the whole recording.
      recorder.start(1000);
    }

    setHasStartedSession(true);
    setIsRequestingMedia(false);

    const opening = interview?.transcript[0];
    if (opening?.role === "interviewer") {
      speak(
        opening.text,
        () => setIsAiSpeaking(true),
        () => setIsAiSpeaking(false)
      );
    }
  }

  async function submitTurn(body: FormData | { text: string }) {
    setTurnError(null);
    setIsProcessingTurn(true);
    try {
      const { data } = await api.post<{
        candidateText: string;
        interviewerText: string | null;
        isComplete: boolean;
      }>(`/api/interviews/${interviewId}/turn`, body);

      setInterview((prev) =>
        prev
          ? {
              ...prev,
              transcript: [
                ...prev.transcript,
                { role: "candidate", text: data.candidateText },
                ...(data.interviewerText
                  ? [{ role: "interviewer" as const, text: data.interviewerText }]
                  : []),
              ],
            }
          : prev
      );

      if (data.interviewerText) {
        speak(
          data.interviewerText,
          () => setIsAiSpeaking(true),
          () => setIsAiSpeaking(false)
        );
      }

      if (data.isComplete) {
        await refreshInterview();
      }
    } catch (err) {
      setTurnError(
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Couldn't process that answer right now."
      );
    } finally {
      setIsProcessingTurn(false);
    }
  }

  async function handleSubmitText() {
    const text = textAnswer.trim();
    if (!text) return;
    setTextAnswer("");
    setShowTextFallback(false);
    await submitTurn({ text });
  }

  async function handleEndInterview() {
    setIsEnding(true);
    setTurnError(null);
    try {
      window.speechSynthesis?.cancel();
      setIsAiSpeaking(false);
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }

      const recorder = sessionRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.stop();
        });
        const blob = new Blob(sessionChunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        if (blob.size > 0) {
          setSessionRecordingUrl(URL.createObjectURL(blob));
        }
      }
      sessionStreamRef.current?.getTracks().forEach((t) => t.stop());
      sessionStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;

      const { data } = await api.post<Partial<InterviewRecord>>(
        `/api/interviews/${interviewId}/end`
      );
      setInterview((prev) => (prev ? { ...prev, ...data, status: "completed" } : prev));
    } catch {
      setTurnError("Couldn't end the interview right now.");
    } finally {
      setIsEnding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="pt-10">
        <p className="text-text-2 text-sm">Loading interview…</p>
      </div>
    );
  }

  if (loadError || !interview) {
    return (
      <div className="pt-10">
        <p className="text-coral text-sm" role="alert">
          {loadError ?? "Interview not found."}
        </p>
      </div>
    );
  }

  if (interview.status === "completed") {
    return (
      <div className="pt-10">
        <div className="card mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Interview complete</p>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-[32px] font-display font-bold">
                  {interview.overallScore !== null ? Math.round(interview.overallScore) : "—"}
                  <span className="text-lg text-text-3">/100</span>
                </h1>
                {interview.recommendation && (
                  <span
                    className={`font-mono text-[11px] px-2.5 py-1 rounded-full ${
                      RECOMMENDATION_STYLES[interview.recommendation] ?? "bg-card-2 text-text-2"
                    }`}
                  >
                    {interview.recommendation}
                  </span>
                )}
              </div>
              {interview.recommendationReason && (
                <p className="text-text-2 text-[15px] mt-2">{interview.recommendationReason}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                type="button"
                className="btn btn-small"
                onClick={() => generateInterviewReportPdf(interview)}
              >
                ⬇ Download report (PDF)
              </button>
              {sessionRecordingUrl && (
                <a
                  href={sessionRecordingUrl}
                  download="interview-recording.webm"
                  className="btn btn-small"
                >
                  ⬇ Download session recording
                </a>
              )}
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={() => navigate(`/resumes/${interview.resumeId}`)}
              >
                Back to ATS report →
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-5">
          <ScoreTile label="Communication" score={interview.communicationScore} />
          <ScoreTile label="Technical depth" score={interview.technicalDepthScore} />
          <ScoreTile label="Resume consistency" score={interview.resumeConsistencyScore} />
          <ScoreTile label="Confidence" score={interview.confidenceScore} />
        </div>

        {interview.detailedFeedback && (
          <div className="card mb-5">
            <h2 className="mb-1.5">Detailed feedback</h2>
            <p className="text-text-2 text-[15px]">{interview.detailedFeedback}</p>
          </div>
        )}

        {interview.feedback && (
          <div className="card mb-5">
            {interview.feedback.strengths.length > 0 && (
              <div className="mb-4">
                <h2 className="mb-1.5 text-teal">Strengths</h2>
                <ul className="list-disc pl-5 space-y-1">
                  {interview.feedback.strengths.map((s, i) => (
                    <li key={i} className="text-text-2 text-[14px]">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {interview.feedback.weaknesses.length > 0 && (
              <div className="mb-4">
                <h2 className="mb-1.5 text-amber">Weaknesses</h2>
                <p className="text-text-3 text-xs mb-2.5">
                  Share these with your faculty — courses are assigned by
                  them, from{" "}
                  <Link to="/assignments" className="underline">
                    My assignments
                  </Link>
                  .
                </p>
                <ul className="space-y-2.5">
                  {interview.feedback.weaknesses.map((s, i) => (
                    <li key={i} className="text-text-2 text-[14px]">
                      <div className="flex items-start justify-between gap-3">
                        <span>• {s}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {buildCourseResources(s).map((resource) => (
                            <a
                              key={resource.platform}
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                              title={`Search on ${resource.platform}`}
                              className="hover:opacity-80 hover:scale-105 transition-transform"
                            >
                              <PlatformIcon platform={resource.platform} />
                            </a>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {interview.feedback.redFlags.length > 0 && (
              <div>
                <h2 className="mb-1.5 text-red">Red flags</h2>
                <ul className="list-disc pl-5 space-y-1">
                  {interview.feedback.redFlags.map((s, i) => (
                    <li key={i} className="text-text-2 text-[14px]">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="card">
          <h2 className="mb-3">Transcript</h2>
          {interview.transcript.map((turn, i) => (
            <div
              key={i}
              className={`flex mb-2.5 ${turn.role === "candidate" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-3.5 py-2.5 text-[14px] ${
                  turn.role === "candidate"
                    ? "bg-lime text-white"
                    : "bg-card-2 border border-border text-text"
                }`}
              >
                {turn.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasStartedSession) {
    return (
      <div className="pt-10">
        <div className="card max-w-[560px] mx-auto py-10 px-8 text-center">
          <p className="eyebrow">AI mock interview</p>
          <h1 className="text-[22px] font-display font-bold mb-4">Before you begin</h1>
          <ul className="text-left text-text-2 text-[14px] space-y-2.5 mb-7">
            <li>• The AI interviewer will ask you questions out loud, based on your resume.</li>
            <li>
              • After each question, tap <strong className="text-text">🎤 Tap to speak</strong> to
              start recording your answer.
            </li>
            <li>
              • When you're done answering, tap the button again (
              <strong className="text-text">Tap to stop</strong>) to submit it.
            </li>
            <li>• The next question will then be asked automatically -- just repeat.</li>
            <li>• No mic or camera? You can type your answer instead at any point.</li>
            <li>• This will ask for camera and microphone access to begin.</li>
          </ul>
          <button
            type="button"
            className="btn btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isRequestingMedia}
            onClick={handleStartSession}
          >
            {isRequestingMedia ? "Requesting camera…" : "I'm ready — start interview"}
          </button>
        </div>
      </div>
    );
  }

  const statusLabel = isAiSpeaking
    ? "AI is speaking…"
    : isProcessingTurn
    ? "Processing your answer…"
    : isRecording
    ? "Recording your answer — tap again when you're done."
    : "Tap the mic button below when you're ready to answer.";

  return (
    <div className="pt-10">
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="video-tile">
          {!isAudioOnly ? (
            <video ref={videoRef} autoPlay muted playsInline style={{ transform: "scaleX(-1)" }} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-text-3">
              <span className="text-3xl">🎙️</span>
              <span className="text-xs font-mono">Audio only</span>
            </div>
          )}
          <span className="video-tile-label">You</span>
        </div>
        <div className="video-tile">
          <div className={`ai-avatar-ring ${isAiSpeaking ? "speaking" : ""}`}>
            <svg viewBox="0 0 64 64" className="ai-avatar-face" aria-hidden="true">
              <rect x="14" y="18" width="36" height="30" rx="10" fill="rgba(255,255,255,0.92)" />
              <rect x="28" y="8" width="8" height="12" rx="3" fill="rgba(255,255,255,0.92)" />
              <circle cx="32" cy="8" r="4" fill="rgba(255,255,255,0.92)" />
              <circle cx="24" cy="33" r="4" fill="#3547FF" />
              <circle cx="40" cy="33" r="4" fill="#3547FF" />
              <rect
                x="23"
                y="42"
                width="18"
                height={isAiSpeaking ? 5 : 3}
                rx="2.5"
                fill="#3547FF"
              />
            </svg>
          </div>
          <span className="video-tile-label">AI Interviewer</span>
        </div>
      </div>

      {statusLabel && (
        <p className="text-text-2 text-xs font-mono text-center mb-3">
          {isRecording ? "🔴 " : ""}
          {statusLabel}
        </p>
      )}

      {mediaErrorMessage && (
        <p className="text-amber text-xs mb-3 text-center" role="status">
          {mediaErrorMessage}
        </p>
      )}

      {turnError && (
        <p className="text-coral text-xs mb-3 text-center" role="alert">
          {turnError}
        </p>
      )}

      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className={`btn ${isRecording ? "btn-primary" : ""} disabled:opacity-60 disabled:cursor-not-allowed`}
            disabled={isAiSpeaking || isProcessingTurn || isEnding || !hasAudioTrack}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
          >
            {isRecording ? "⏹ Tap to stop" : "🎤 Tap to speak"}
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-small"
              onClick={() => setShowTextFallback((v) => !v)}
            >
              {showTextFallback ? "Hide text answer" : "Type your answer instead"}
            </button>
            <button
              type="button"
              className="btn btn-small disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isEnding}
              onClick={handleEndInterview}
            >
              {isEnding ? "Ending…" : "End interview"}
            </button>
          </div>
        </div>

        {showTextFallback && (
          <div className="mt-3.5">
            <textarea
              className="w-full rounded-lg border border-border-strong bg-card-2 p-3 text-sm"
              rows={3}
              placeholder="Type your answer…"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={isProcessingTurn}
            />
            <div className="text-right mt-2">
              <button
                type="button"
                className="btn btn-primary btn-small disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isProcessingTurn || !textAnswer.trim()}
                onClick={handleSubmitText}
              >
                Submit answer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
