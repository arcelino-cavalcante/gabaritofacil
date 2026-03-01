from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# --- Alunos ---
class AlunoBase(BaseModel):
    nome: str
    numero_chamada: Optional[int] = None

class AlunoCreate(AlunoBase):
    pass

class Aluno(AlunoBase):
    id: int
    turma_id: int
    model_config = ConfigDict(from_attributes=True)

# --- Notas ---
class NotaBase(BaseModel):
    nota: float
    acertos: int
    erros: int
    respostas_marcadas: Optional[str] = None

class NotaCreate(NotaBase):
    aluno_id: int
    avaliacao_id: int

class Nota(NotaBase):
    id: int
    aluno_id: int
    avaliacao_id: int
    model_config = ConfigDict(from_attributes=True)

# --- Avaliações ---
class AvaliacaoBase(BaseModel):
    nome: str
    gabarito: Optional[str] = None

class AvaliacaoCreate(AvaliacaoBase):
    pass

class Avaliacao(AvaliacaoBase):
    id: int
    data: datetime
    turma_id: int
    notas: List[Nota] = []
    model_config = ConfigDict(from_attributes=True)

# --- Turmas ---
class TurmaBase(BaseModel):
    nome: str
    escola: Optional[str] = None
    ano: Optional[str] = None

class TurmaCreate(TurmaBase):
    pass

class Turma(TurmaBase):
    id: int
    alunos: List[Aluno] = []
    avaliacoes: List[Avaliacao] = []
    model_config = ConfigDict(from_attributes=True)
