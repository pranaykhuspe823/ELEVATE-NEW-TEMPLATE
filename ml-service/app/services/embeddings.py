import os

_model = None


def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        model_name = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        _model = SentenceTransformer(model_name)
    return _model


def embed(texts: list[str]):
    model = get_model()
    return model.encode(texts, normalize_embeddings=True)


def cosine_similarity(a, b) -> float:
    return float((a * b).sum())
