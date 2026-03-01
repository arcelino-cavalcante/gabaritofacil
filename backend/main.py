from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import omr

app = FastAPI(title="Gabarito Fácil API Exclusiva de IA")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(omr.router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Gabarito Fácil API está rodando perfeitamente!"}

