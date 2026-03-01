#!/bin/bash
# Script para rodar o app localmente com acesso à rede (Celular)

echo "Iniciando Gabarito Fácil Local (Rede Habilitada)"

# Iniciar backend em background
echo "Iniciando servidor de Inteligência Artificial (FastAPI)..."
cd backend
# Se o venv existir, ativamos provisoriamente
if [ -d "venv" ]; then
    source venv/bin/activate
fi
python3 -m uvicorn main:app --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!
cd ..

# Iniciar frontend com rede exposta
echo "Iniciando aplicativo React (Vite)..."
npm run dev -- --host

# Quando sair do Node.js, mata o backend tbm
kill $BACKEND_PID
echo "Servidores desligados. Até logo!"
