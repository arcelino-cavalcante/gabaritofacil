from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from database import engine, Base
# from routers import turmas, alunos, avaliacoes
from routers import omr

# Cria as tabelas no banco de dados (Desativado: Banco de Dados agora 100% Local/Offline no Frontend)
# Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gabarito Fácil API Exclusiva de IA")

# Configuração de CORS para permitir que o Frontend consiga chamar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permitindo tudo para facilitar testes locais
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Adicionando Rotas OMR (Sem Banco de Dados)
# app.include_router(turmas.router, prefix="/api")
# app.include_router(alunos.router, prefix="/api")
# app.include_router(avaliacoes.router, prefix="/api")
app.include_router(omr.router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Gabarito Fácil API está rodando perfeitamente!"}
