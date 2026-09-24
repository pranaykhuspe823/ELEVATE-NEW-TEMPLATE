from fastapi import APIRouter
from pydantic import BaseModel

from app.routers.score import _normalize_phrase, keyword_is_present

router = APIRouter()

MAX_SKILLS = 40
MAX_RESUMES = 300

# A broad requirement is satisfied by experience with any specific tool that
# falls under it (a job asking for "SQL" is met by someone who lists MySQL).
# Deliberately one-directional: the reverse (asking for MySQL, having only
# "SQL") is not implied. Keys are lowercase.
IMPLIED_BY: dict[str, list[str]] = {
    "sql": ["mysql", "postgresql", "postgres", "sqlite", "sql server", "mariadb", "oracle", "t-sql", "pl/sql"],
    "nosql": ["mongodb", "cassandra", "dynamodb", "redis", "couchdb"],
    "cloud": ["aws", "azure", "gcp", "google cloud"],
    "cloud computing": ["aws", "azure", "gcp", "google cloud"],
    "version control": ["git", "github", "gitlab", "bitbucket"],
    "containerization": ["docker", "podman"],
    "container orchestration": ["kubernetes", "docker swarm"],
    "machine learning": ["scikit-learn", "sklearn", "tensorflow", "pytorch", "keras"],
    "deep learning": ["tensorflow", "pytorch", "keras"],
    "data visualization": ["tableau", "power bi", "matplotlib", "d3", "seaborn"],
    "ci/cd": ["jenkins", "github actions", "gitlab ci", "circleci"],
    "frontend": ["react", "angular", "vue", "html", "css"],
    "backend": ["node.js", "express", "django", "flask", "spring", "fastapi"],
    "object-oriented programming": ["java", "c++", "c#", "oop"],
}


def _has_skill(skill: str, raw: str, normalized: str) -> bool:
    if keyword_is_present(skill, raw, normalized):
        return True
    return any(
        keyword_is_present(tool, raw, normalized)
        for tool in IMPLIED_BY.get(skill.lower(), [])
    )


class ResumeText(BaseModel):
    id: str
    text: str


class MatchRequest(BaseModel):
    skills: list[str]
    resumes: list[ResumeText]


class MatchResult(BaseModel):
    id: str
    matched: list[str]
    missing: list[str]


@router.post("/match-skills", response_model=list[MatchResult])
def match_skills(req: MatchRequest):
    """For each resume, which of the required skills it demonstrates. Uses
    the same word-boundary + stemming + synonym + fuzzy matcher as the ATS
    keyword score, so a skill counts here exactly when it would count there."""
    seen: set[str] = set()
    skills: list[str] = []
    for raw in req.skills:
        skill = raw.strip()
        if skill and skill.lower() not in seen:
            seen.add(skill.lower())
            skills.append(skill)
    skills = skills[:MAX_SKILLS]

    results: list[MatchResult] = []
    for resume in req.resumes[:MAX_RESUMES]:
        normalized = _normalize_phrase(resume.text)
        matched = [s for s in skills if _has_skill(s, resume.text, normalized)]
        matched_set = set(matched)
        missing = [s for s in skills if s not in matched_set]
        results.append(MatchResult(id=resume.id, matched=matched, missing=missing))
    return results
