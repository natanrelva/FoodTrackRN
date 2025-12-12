#!/bin/bash

# 🚀 FoodTrack Setup Script
# Este script automatiza a configuração inicial do projeto

set -e

echo "🍽️  Iniciando setup do FoodTrack..."
echo "=================================="

# Verificar pré-requisitos
echo "📋 Verificando pré-requisitos..."

# Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js 18+ primeiro."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versão $NODE_VERSION encontrada. Versão 18+ necessária."
    exit 1
fi
echo "✅ Node.js $(node -v)"

# pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Instalando pnpm..."
    npm install -g pnpm
fi
echo "✅ pnpm $(pnpm -v)"

# Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale Docker primeiro."
    exit 1
fi
echo "✅ Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)"

# Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Instale Docker Compose primeiro."
    exit 1
fi
echo "✅ Docker Compose $(docker-compose -v | cut -d' ' -f3 | cut -d',' -f1)"

echo ""
echo "🔧 Configurando ambiente..."

# 1. Instalar dependências
echo "📦 Instalando dependências..."
pnpm install

# 2. Configurar variáveis de ambiente
echo "⚙️  Configurando variáveis de ambiente..."
if [ ! -f backend/api-gateway/.env ]; then
    cp backend/api-gateway/.env.example backend/api-gateway/.env
    echo "✅ Arquivo .env criado para API Gateway"
else
    echo "ℹ️  Arquivo .env já existe para API Gateway"
fi

if [ ! -f frontend/kitchen/.env ]; then
    cp frontend/kitchen/.env.example frontend/kitchen/.env
    echo "✅ Arquivo .env criado para Kitchen App"
else
    echo "ℹ️  Arquivo .env já existe para Kitchen App"
fi

if [ ! -f frontend/delivery/.env ]; then
    cp frontend/delivery/.env.example frontend/delivery/.env
    echo "✅ Arquivo .env criado para Delivery App"
else
    echo "ℹ️  Arquivo .env já existe para Delivery App"
fi

# 3. Iniciar serviços Docker
echo "🐳 Iniciando serviços Docker..."
docker-compose -f docker-compose.dev.yml up -d

# Aguardar PostgreSQL estar pronto
echo "⏳ Aguardando PostgreSQL estar pronto..."
sleep 10

# Verificar se PostgreSQL está rodando
until docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres; do
    echo "⏳ Aguardando PostgreSQL..."
    sleep 2
done
echo "✅ PostgreSQL está pronto"

# 4. Executar migrations
echo "🗄️  Executando migrations do banco de dados..."
pnpm migrate

# 5. Build dos pacotes compartilhados
echo "🔨 Fazendo build dos pacotes compartilhados..."
pnpm build:types
pnpm build:shared

echo ""
echo "🎉 Setup concluído com sucesso!"
echo "================================"
echo ""
echo "📱 Aplicações disponíveis:"
echo "   • Cliente Web:       http://localhost:3000"
echo "   • Tenant Dashboard:  http://localhost:3001"
echo "   • Kitchen App:       http://localhost:3002"
echo "   • Delivery App:      http://localhost:3003"
echo "   • API Gateway:       http://localhost:4000"
echo "   • Adminer (DB):      http://localhost:8082"
echo ""
echo "🚀 Para iniciar o desenvolvimento:"
echo "   pnpm dev"
echo ""
echo "🔐 Credenciais de teste:"
echo "   Email: test@test.com"
echo "   Senha: 123456"
echo ""
echo "📚 Documentação:"
echo "   • Arquitetura:  docs/ARCHITECTURE.md"
echo "   • Integração:   docs/INTEGRATION.md"
echo "   • API:          docs/API.md"
echo "   • Deploy:       docs/DEPLOYMENT.md"
echo ""