from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db

router = APIRouter(
    prefix="/alunos",
    tags=["alunos"],
)

@router.post("/turma/{turma_id}", response_model=schemas.Aluno)
def create_aluno(turma_id: int, aluno: schemas.AlunoCreate, db: Session = Depends(get_db)):
    db_turma = db.query(models.Turma).filter(models.Turma.id == turma_id).first()
    if not db_turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    db_aluno = models.Aluno(**aluno.model_dump(), turma_id=turma_id)
    db.add(db_aluno)
    db.commit()
    db.refresh(db_aluno)
    return db_aluno

@router.get("/turma/{turma_id}", response_model=List[schemas.Aluno])
def read_alunos_by_turma(turma_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    alunos = db.query(models.Aluno).filter(models.Aluno.turma_id == turma_id).offset(skip).limit(limit).all()
    return alunos

@router.delete("/{aluno_id}")
def delete_aluno(aluno_id: int, db: Session = Depends(get_db)):
    db_aluno = db.query(models.Aluno).filter(models.Aluno.id == aluno_id).first()
    if db_aluno is None:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    db.delete(db_aluno)
    db.commit()
    return {"message": "Aluno deletado com sucesso"}
