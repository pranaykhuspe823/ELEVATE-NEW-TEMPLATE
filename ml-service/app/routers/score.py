import re
from datetime import datetime
from difflib import SequenceMatcher

from fastapi import APIRouter
from pydantic import BaseModel

from app.data.synonyms import SYNONYM_LOOKUP

router = APIRouter()


class ExperienceEntry(BaseModel):
    title: str | None = None
    company: str | None = None
    startDate: str | None = None
    endDate: str | None = None
    bullets: list[str] = []


class ContactInfo(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    links: list[str] = []


class ProjectEntry(BaseModel):
    name: str | None = None
    description: str | None = None
    technologies: list[str] = []


class ScoreRequest(BaseModel):
    contact: ContactInfo
    summary: str | None = None
    skills: list[str] = []
    experience: list[ExperienceEntry] = []
    education: list[dict] = []
    projects: list[ProjectEntry] = []
    certifications: list[str] = []
    relevant_keywords: list[str] = []


class ScoreBreakdown(BaseModel):
    formatting_score: int
    keyword_score: int
    structure_score: int
    matched_keywords: list[str]
    missing_keywords: list[str]


# ---------------------------------------------------------------------------
# Keyword matching: word-boundary aware, suffix-normalized, synonym-expanded,
# with a conservative fuzzy fallback. Plain substring checks (the previous
# approach) both false-positive (e.g. "java" inside "javascript") and
# false-negative (e.g. "managed" not matching a "manage" keyword), so a real
# ATS-style matcher needs all three passes below.
# ---------------------------------------------------------------------------

_SUFFIXES = ["ing", "ed", "es", "s"]


def _normalize_token(token: str) -> str:
    token = token.lower().strip()
    for suffix in _SUFFIXES:
        if len(token) > len(suffix) + 3 and token.endswith(suffix):
            return token[: -len(suffix)]
    return token


def _normalize_phrase(phrase: str) -> str:
    words = re.findall(r"[a-z0-9+.#]+", phrase.lower())
    return " ".join(_normalize_token(w) for w in words)


def _word_boundary_match(keyword: str, text: str) -> bool:
    escaped = re.escape(keyword)
    pattern = r"(?<![a-z0-9])" + escaped + r"(?![a-z0-9])"
    return re.search(pattern, text, re.IGNORECASE) is not None


def _synonym_variants(keyword: str) -> set[str]:
    return SYNONYM_LOOKUP.get(keyword.lower().strip(), {keyword.lower().strip()})


def _fuzzy_match(keyword: str, candidates: list[str], threshold: float = 0.85) -> bool:
    for candidate in candidates:
        if len(candidate) < 4:
            continue
        if SequenceMatcher(None, keyword, candidate).ratio() >= threshold:
            return True
    return False


def keyword_is_present(keyword: str, raw_text: str, normalized_text: str) -> bool:
    variants = _synonym_variants(keyword)
    for variant in variants:
        if _word_boundary_match(variant, raw_text):
            return True
        if _normalize_phrase(variant) and _normalize_phrase(variant) in normalized_text:
            return True

    candidate_words = set(re.findall(r"[a-z0-9+.#]+", raw_text.lower()))
    return _fuzzy_match(keyword.lower().strip(), list(candidate_words))


def build_searchable_text(req: ScoreRequest) -> str:
    parts: list[str] = [req.summary or ""]
    parts.extend(req.skills)
    parts.extend(req.certifications)
    for exp in req.experience:
        parts.extend(exp.bullets)
    for proj in req.projects:
        parts.append(proj.name or "")
        parts.append(proj.description or "")
        parts.extend(proj.technologies)
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Formatting: bullet quality, date/bullet coverage, reverse-chronological
# order, summary length sanity, skills-list sanity.
# ---------------------------------------------------------------------------

_MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
    "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}


def parse_lenient_date(value: str | None) -> tuple[int, int] | None:
    """Best-effort (year, month) parse of free-text resume dates. Returns
    None (never raises) for anything unrecognized, so callers can skip
    entries gracefully instead of penalizing unparseable dates."""
    if not value:
        return None
    text = value.strip().lower()
    if text in {"present", "current", "now", "ongoing"}:
        now = datetime.now()
        return (now.year, now.month)

    year_match = re.search(r"(19|20)\d{2}", text)
    if not year_match:
        return None
    year = int(year_match.group(0))

    month = 1
    for name, num in _MONTHS.items():
        if re.search(r"\b" + name + r"\b", text):
            month = num
            break
    else:
        numeric_month = re.search(r"\b(0?[1-9]|1[0-2])[/-]", text)
        if numeric_month:
            month = int(numeric_month.group(1))

    return (year, month)


def chronological_order_score(experience: list[ExperienceEntry]) -> int:
    """3 points if parseable experience entries are ordered most-recent-first
    (using startDate), 0 if out of order. Entries with unparseable dates are
    skipped rather than penalized; if fewer than 2 entries have parseable
    dates, the check can't say anything meaningful so it awards the point."""
    parsed = [
        parse_lenient_date(e.startDate)
        for e in experience
        if parse_lenient_date(e.startDate)
    ]
    if len(parsed) < 2:
        return 3
    for earlier, later in zip(parsed, parsed[1:]):
        if earlier < later:
            return 0
    return 3


def summary_length_score(summary: str | None) -> int:
    if not summary:
        return 0
    word_count = len(summary.split())
    if 15 <= word_count <= 60:
        return 2
    if word_count > 0:
        return 1
    return 0


def skills_sanity_score(skills: list[str]) -> int:
    count = len(skills)
    if 3 <= count <= 40:
        return 1
    return 0


@router.post("/score-rules", response_model=ScoreBreakdown)
def score_rules(req: ScoreRequest):
    # --- Formatting (20 pts): bullet quality (6) + date coverage (4) +
    # bulleted coverage (4) + chronological order (3) + summary length (2) +
    # skills sanity (1) ---
    formatting_score = 0
    all_bullets = [b for exp in req.experience for b in exp.bullets]
    if all_bullets:
        avg_len = sum(len(b.split()) for b in all_bullets) / len(all_bullets)
        formatting_score += 6 if 6 <= avg_len <= 35 else 3

    if req.experience:
        dated_ratio = sum(1 for e in req.experience if e.startDate) / len(
            req.experience
        )
        if dated_ratio >= 0.7:
            formatting_score += 4
        bulleted_ratio = sum(1 for e in req.experience if e.bullets) / len(
            req.experience
        )
        if bulleted_ratio >= 0.7:
            formatting_score += 4

    formatting_score += chronological_order_score(req.experience)
    formatting_score += summary_length_score(req.summary)
    formatting_score += skills_sanity_score(req.skills)
    formatting_score = min(formatting_score, 20)

    # --- Keywords (30 pts): word-boundary + stemmed + synonym + fuzzy match
    # against summary, skills, certifications, experience bullets, and
    # project name/description/technologies ---
    keywords = [k.strip() for k in req.relevant_keywords if k.strip()]
    raw_text = build_searchable_text(req)
    normalized_text = _normalize_phrase(raw_text)

    matched: list[str] = []
    missing: list[str] = []
    for kw in keywords:
        if keyword_is_present(kw, raw_text, normalized_text):
            matched.append(kw)
        else:
            missing.append(kw)

    # backend/src/services/atsBoost.ts re-runs this formula to show students
    # how much a course would raise their score -- keep the two in sync.
    keyword_score = 0
    if keywords:
        keyword_score = min(round((len(matched) / len(keywords)) * 30), 30)

    # --- Structure (25 pts): weighted by how critical each section actually
    # is, rather than 6 equal-weight booleans ---
    structure_score = 0
    structure_score += 3 if req.contact.name else 0
    structure_score += 3 if req.contact.email else 0
    structure_score += 2 if req.contact.phone else 0
    structure_score += 2 if req.contact.links else 0
    structure_score += 3 if req.summary else 0
    structure_score += 3 if req.skills else 0
    structure_score += 6 if req.experience else 0
    structure_score += 3 if req.education else 0

    return ScoreBreakdown(
        formatting_score=formatting_score,
        keyword_score=keyword_score,
        structure_score=structure_score,
        matched_keywords=matched,
        missing_keywords=missing,
    )
