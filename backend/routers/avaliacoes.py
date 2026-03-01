from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db

router = APIRouter(
    prefix="/avaliacoes",
    tags=["avaliacoes"],
)

@router.post("/turma/{turma_id}", response_model=schemas.Avaliacao)
def create_avaliacao(turma_id: int, avaliacao: schemas.AvaliacaoCreate, db: Session = Depends(get_db)):
    db_turma = db.query(models.Turma).filter(models.Turma.id == turma_id).first()
    if not db_turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    db_av = models.Avaliacao(**avaliacao.model_dump(), turma_id=turma_id)
    db.add(db_av)
    db.commit()
    db.refresh(db_av)
    return db_av

@router.get("/turma/{turma_id}", response_model=List[schemas.Avaliacao])
def read_avaliacoes_by_turma(turma_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    avaliacoes = db.query(models.Avaliacao).filter(models.Avaliacao.turma_id == turma_id).offset(skip).limit(limit).all()
    return avaliacoes

@router.get("/{avaliacao_id}", response_model=schemas.Avaliacao)
def read_avaliacao(avaliacao_id: int, db: Session = Depends(get_db)):
    db_av = db.query(models.Avaliacao).filter(models.Avaliacao.id == avaliacao_id).first()
    if not db_av:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    return db_av

@router.delete("/{avaliacao_id}")
def delete_avaliacao(avaliacao_id: int, db: Session = Depends(get_db)):
    db_av = db.query(models.Avaliacao).filter(models.Avaliacao.id == avaliacao_id).first()
    if not db_av:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    db.delete(db_av)
    db.commit()
    return {"message": "Avaliação deletada com sucesso"}

# --- Endpoint de Notas associadas a avaliações ---
@router.post("/{avaliacao_id}/notas", response_model=schemas.Nota)
def create_nota(avaliacao_id: int, nota: schemas.NotaCreate, db: Session = Depends(get_db)):
    db_av = db.query(models.Avaliacao).filter(models.Avaliacao.id == avaliacao_id).first()
    if not db_av:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    
    db_nota = models.Nota(**nota.model_dump())
    db.add(db_nota)
    db.commit()
    db.refresh(db_nota)
    return db_nota
