from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime

from database import Base

class Turma(Base):
    __tablename__ = "turmas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    escola = Column(String, nullable=True)
    ano = Column(String, nullable=True)
    
    alunos = relationship("Aluno", back_populates="turma", cascade="all, delete-orphan")
    avaliacoes = relationship("Avaliacao", back_populates="turma", cascade="all, delete-orphan")

class Aluno(Base):
    __tablename__ = "alunos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    numero_chamada = Column(Integer, nullable=True)
    turma_id = Column(Integer, ForeignKey("turmas.id"))

    turma = relationship("Turma", back_populates="alunos")
    notas = relationship("Nota", back_populates="aluno", cascade="all, delete-orphan")

class Avaliacao(Base):
    __tablename__ = "avaliacoes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    data = Column(DateTime, default=datetime.datetime.utcnow)
    gabarito = Column(String, nullable=True)  # JSON string
    turma_id = Column(Integer, ForeignKey("turmas.id"))

    turma = relationship("Turma", back_populates="avaliacoes")
    notas = relationship("Nota", back_populates="avaliacao", cascade="all, delete-orphan")

class Nota(Base):
    __tablename__ = "notas"

    id = Column(Integer, primary_key=True, index=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"))
    avaliacao_id = Column(Integer, ForeignKey("avaliacoes.id"))
    nota = Column(Float)
    acertos = Column(Integer)
    erros = Column(Integer)
    respostas_marcadas = Column(String, nullable=True) # JSON string

    aluno = relationship("Aluno", back_populates="notas")
    avaliacao = relationship("Avaliacao", back_populates="notas")
