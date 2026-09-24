import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.embeddings import embed

router = APIRouter()

MAX_MATCHES_PER_CANDIDATE = 5


class Candidate(BaseModel):
    id: str
    units: list[str]


class SimilarityRequest(BaseModel):
    units: list[str]
    candidates: list[Candidate]
    unit_threshold: float = 0.85
    min_units: int = 3


class UnitMatch(BaseModel):
    a_index: int
    b_index: int
    similarity: float


class CandidateResult(BaseModel):
    id: str
    score: float
    matches: list[UnitMatch]


@router.post("/semantic-similarity", response_model=list[CandidateResult])
def semantic_similarity(req: SimilarityRequest):
    """Meaning-based resume overlap. A unit (bullet/sentence) counts as
    matched when its best counterpart in the other resume has cosine
    similarity >= unit_threshold. The score is the average of the matched
    fraction in each direction, so a resume only scores high when most of
    *both* documents are covered -- a few shared generic bullets don't."""
    empty = [CandidateResult(id=c.id, score=0.0, matches=[]) for c in req.candidates]
    if len(req.units) < req.min_units or not req.candidates:
        return empty

    all_units = list(req.units)
    for c in req.candidates:
        all_units.extend(c.units)
    embeddings = embed(all_units)

    a = embeddings[: len(req.units)]
    offset = len(req.units)
    results: list[CandidateResult] = []
    for c in req.candidates:
        b = embeddings[offset : offset + len(c.units)]
        offset += len(c.units)
        if len(c.units) < req.min_units:
            results.append(CandidateResult(id=c.id, score=0.0, matches=[]))
            continue

        sim = a @ b.T
        best_for_a = sim.max(axis=1)
        best_for_b = sim.max(axis=0)
        a_coverage = float((best_for_a >= req.unit_threshold).mean())
        b_coverage = float((best_for_b >= req.unit_threshold).mean())

        matched = np.where(best_for_a >= req.unit_threshold)[0]
        matches = sorted(
            (
                UnitMatch(
                    a_index=int(i),
                    b_index=int(sim[i].argmax()),
                    similarity=float(best_for_a[i]),
                )
                for i in matched
            ),
            key=lambda m: m.similarity,
            reverse=True,
        )[:MAX_MATCHES_PER_CANDIDATE]

        results.append(
            CandidateResult(
                id=c.id, score=(a_coverage + b_coverage) / 2, matches=matches
            )
        )
    return results
