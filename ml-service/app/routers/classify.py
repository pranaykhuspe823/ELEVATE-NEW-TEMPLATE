from fastapi import APIRouter
from pydantic import BaseModel

from ..data.fields import CANONICAL_FIELDS
from ..services.embeddings import embed, cosine_similarity

router = APIRouter()

_field_embeddings_cache = None


def get_field_embeddings():
    global _field_embeddings_cache
    if _field_embeddings_cache is None:
        field_names = list(CANONICAL_FIELDS.keys())
        field_texts = [", ".join(skills) for skills in CANONICAL_FIELDS.values()]
        embeddings = embed(field_texts)
        _field_embeddings_cache = dict(zip(field_names, embeddings))
    return _field_embeddings_cache


class ClassifyRequest(BaseModel):
    skills: list[str] = []
    text: str = ""


class FieldScore(BaseModel):
    field: str
    similarity: float


class ClassifyResponse(BaseModel):
    ranked: list[FieldScore]


@router.post("/classify-field", response_model=ClassifyResponse)
def classify_field(req: ClassifyRequest):
    resume_text = ", ".join(req.skills) if req.skills else req.text
    if not resume_text.strip():
        return ClassifyResponse(ranked=[])

    resume_embedding = embed([resume_text])[0]
    field_embeddings = get_field_embeddings()

    scores = [
        FieldScore(field=name, similarity=cosine_similarity(resume_embedding, emb))
        for name, emb in field_embeddings.items()
    ]
    scores.sort(key=lambda s: s.similarity, reverse=True)
    return ClassifyResponse(ranked=scores)
