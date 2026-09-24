import io

from docx import Document
from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter()


def extract_pdf_text(data: bytes) -> str:
    import pdfplumber

    text_parts: list[str] = []
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                text_parts.append(page.extract_text() or "")
        text = "\n".join(text_parts).strip()
        if text:
            return text
    except Exception:
        pass

    import fitz  # PyMuPDF fallback for scanned/odd-encoded PDFs

    doc = fitz.open(stream=data, filetype="pdf")
    return "\n".join(page.get_text() for page in doc).strip()


def extract_docx_text(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs).strip()


@router.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    data = await file.read()
    filename = (file.filename or "").lower()

    if filename.endswith(".pdf") or file.content_type == "application/pdf":
        text = extract_pdf_text(data)
    elif filename.endswith(".docx"):
        text = extract_docx_text(data)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    if not text:
        raise HTTPException(
            status_code=422, detail="Could not extract any text from this file"
        )

    return {"text": text}
