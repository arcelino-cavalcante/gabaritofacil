from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db

router = APIRouter(
    prefix="/turmas",
    tags=["turmas"],
)

@router.post("/", response_model=schemas.Turma)
def create_turma(turma: schemas.TurmaCreate, db: Session = Depends(get_db)):
    db_turma = models.Turma(**turma.model_dump())
    db.add(db_turma)
    db.commit()
    db.refresh(db_turma)
    return db_turma

@router.get("/", response_model=List[schemas.Turma])
def read_turmas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    turmas = db.query(models.Turma).offset(skip).limit(limit).all()
    return turmas

@router.get("/{turma_id}", response_model=schemas.Turma)
def read_turma(turma_id: int, db: Session = Depends(get_db)):
    db_turma = db.query(models.Turma).filter(models.Turma.id == turma_id).first()
    if db_turma is None:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return db_turma

@router.delete("/{turma_id}")
def delete_turma(turma_id: int, db: Session = Depends(get_db)):
    db_turma = db.query(models.Turma).filter(models.Turma.id == turma_id).first()
    if db_turma is None:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    db.delete(db_turma)
    db.commit()
    return {"message": "Turma deletada com sucesso"}
