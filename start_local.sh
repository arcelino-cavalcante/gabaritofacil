#!/bin/bash
# Local Start Script for Gabarito Fácil (100% Serverless / Frontend Only)

echo "Iniciando o servidor local (Frontend) no seu computador..."

# Garante permissões corretas
chmod +x "$0"

# Roda o NPM (Vite) permitindo acesso externo pela rede Wi-Fi local
npm run dev -- --host
