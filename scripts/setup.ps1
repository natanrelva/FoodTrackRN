# 🚀 FoodTrack Setup Script (Windows PowerShell)
# Este script automatiza a configuração inicial do projeto

Write-Host "🍽️  Iniciando setup do FoodTrack..." -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Verificar pré-requisitos
Write-Host "📋 Verificando pré-requisitos..." -ForegroundColor Yellow

# Node.js
try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 18) {
        Write-Host "❌ Node.js versão $nodeVersion encontrada. Versão 18+ necessária." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Instale Node.js 18+ primeiro." -ForegroundColor Red
    exit 1
}

# pnpm
try {
    $pnpmVersion = pnpm -v
    Write-Host "✅ pnpm $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "📦 Instalando pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    $pnpmVersion = pnpm -v
    Write-Host "✅ pnpm $pnpmVersion instalado" -ForegroundColor Green
}

# Docker
try {
    $dockerVersion = docker --version
    Write-Host "✅ $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker não encontrado. Instale Docker Desktop primeiro." -ForegroundColor Red
    exit 1
}

# Docker Compose
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose não encontrado. Instale Docker Compose primeiro." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Configurando ambiente..." -ForegroundColor Yellow

# 1. Instalar dependências
Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
pnpm install

# 2. Configurar variáveis de ambiente
Write-Host "⚙️  Configurando variáveis de ambiente..." -ForegroundColor Yellow

if (!(Test-Path "backend/api-gateway/.env")) {
    Copy-Item "backend/api-gateway/.env.example" "backend/api-gateway/.env"
    Write-Host "✅ Arquivo .env criado para API Gateway" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Arquivo .env já existe para API Gateway" -ForegroundColor Cyan
}

if (!(Test-Path "frontend/kitchen/.env")) {
    Copy-Item "frontend/kitchen/.env.example" "frontend/kitchen/.env"
    Write-Host "✅ Arquivo .env criado para Kitchen App" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Arquivo .env já existe para Kitchen App" -ForegroundColor Cyan
}

if (!(Test-Path "frontend/delivery/.env")) {
    Copy-Item "frontend/delivery/.env.example" "frontend/delivery/.env"
    Write-Host "✅ Arquivo .env criado para Delivery App" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Arquivo .env já existe para Delivery App" -ForegroundColor Cyan
}

# 3. Iniciar serviços Docker
Write-Host "🐳 Iniciando serviços Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up -d

# Aguardar PostgreSQL estar pronto
Write-Host "⏳ Aguardando PostgreSQL estar pronto..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar se PostgreSQL está rodando
$maxAttempts = 30
$attempt = 0
do {
    $attempt++
    try {
        docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres | Out-Null
        $pgReady = $true
        break
    } catch {
        Write-Host "⏳ Aguardando PostgreSQL... (tentativa $attempt/$maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        $pgReady = $false
    }
} while ($attempt -lt $maxAttempts -and !$pgReady)

if ($pgReady) {
    Write-Host "✅ PostgreSQL está pronto" -ForegroundColor Green
} else {
    Write-Host "❌ Timeout aguardando PostgreSQL" -ForegroundColor Red
    exit 1
}

# 4. Executar migrations
Write-Host "🗄️  Executando migrations do banco de dados..." -ForegroundColor Yellow
pnpm migrate

# 5. Build dos pacotes compartilhados
Write-Host "🔨 Fazendo build dos pacotes compartilhados..." -ForegroundColor Yellow
pnpm build:types
pnpm build:shared

Write-Host ""
Write-Host "🎉 Setup concluído com sucesso!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Aplicações disponíveis:" -ForegroundColor Cyan
Write-Host "   • Cliente Web:       http://localhost:3000" -ForegroundColor White
Write-Host "   • Tenant Dashboard:  http://localhost:3001" -ForegroundColor White
Write-Host "   • Kitchen App:       http://localhost:3002" -ForegroundColor White
Write-Host "   • Delivery App:      http://localhost:3003" -ForegroundColor White
Write-Host "   • API Gateway:       http://localhost:4000" -ForegroundColor White
Write-Host "   • Adminer (DB):      http://localhost:8082" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Para iniciar o desenvolvimento:" -ForegroundColor Cyan
Write-Host "   pnpm dev" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Credenciais de teste:" -ForegroundColor Cyan
Write-Host "   Email: test@test.com" -ForegroundColor White
Write-Host "   Senha: 123456" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentação:" -ForegroundColor Cyan
Write-Host "   • Arquitetura:  docs/ARCHITECTURE.md" -ForegroundColor White
Write-Host "   • Integração:   docs/INTEGRATION.md" -ForegroundColor White
Write-Host "   • API:          docs/API.md" -ForegroundColor White
Write-Host "   • Deploy:       docs/DEPLOYMENT.md" -ForegroundColor White
Write-Host ""