from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from services.pdf_generator import build_gabarito_pdf
from services.omr_scanner import corrigir_gabarito_cv2

router = APIRouter(
    prefix="/omr",
    tags=["omr"],
)

from pydantic import BaseModel

class AlunoItem(BaseModel):
    id: str
    nome: str

class GabaritoPDFRequest(BaseModel):
    turma_nome: str
    gabarito_id: str
    num_questoes: int = 20
    layout: int = 1
    alunos: List[AlunoItem] = []

@router.post("/gerar-pdf")
def gerar_gabarito_pdf(req: GabaritoPDFRequest):
    """
    Gera um PDF vetorial de alta definição para todos os alunos da turma.
    """
    
    # Converte models para array de dict
    alunos_dicts = [{"id": a.id, "nome": a.nome} for a in req.alunos]
    
    # Manda rodar o criador do PDF de forma stateless
    pdf_buffer = build_gabarito_pdf(
        turma_nome=req.turma_nome,
        alunos=alunos_dicts,
        gabarito_id=req.gabarito_id,
        num_questoes=req.num_questoes,
        layout=req.layout
    )
    
    tipo_nome = "Nominal" if len(alunos_dicts) > 0 else "EmBranco"
    headers = {
        'Content-Disposition': f'attachment; filename="Gabarito_{req.turma_nome}_{tipo_nome}.pdf"'
    }
    return StreamingResponse(pdf_buffer, media_type='application/pdf', headers=headers)

@router.post("/corrigir")
async def processar_imagem_omr(
    file: UploadFile = File(...),
    num_questoes: int = Form(20)
):
    """
    Recebe a foto do gabarito (tirada pelo celular/webcam),
    processa usando visão computacional (OpenCV) e retorna as respostas detectadas.
    """
    try:
        image_bytes = await file.read()
        resultado = corrigir_gabarito_cv2(image_bytes, num_questoes=num_questoes)
        return JSONResponse(status_code=200, content=resultado)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

