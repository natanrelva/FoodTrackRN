#!/bin/bash

# FoodTrack Development Script
# Script para iniciar o ambiente de desenvolvimento

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se os serviços Docker estão rodando
check_docker_services() {
    log_info "Verificando serviços Docker..."
    
    if ! docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        log_warning "Serviços Docker não estão rodando. Iniciando..."
        docker-compose -f docker-compose.dev.yml up -d
        
        # Aguardar serviços
        log_info "Aguardando serviços ficarem prontos..."
        sleep 10
        
        until docker exec foodtrack-postgres pg_isready -U postgres &> /dev/null; do
            log_info "Aguardando PostgreSQL..."
            sleep 2
        done
        
        until docker exec foodtrack-redis redis-cli ping &> /dev/null; do
            log_info "Aguardando Redis..."
            sleep 2
        done
        
        log_success "Serviços Docker prontos"
    else
        log_success "Serviços Docker já estão rodando"
    fi
}

# Verificar se os pacotes estão compilados
check_packages() {
    log_info "Verificando pacotes compilados..."
    
    if [ ! -d "packages/types/dist" ] || [ ! -d "backend/shared/dist" ]; then
        log_warning "Pacotes não compilados. Compilando..."
        pnpm build:types
        pnpm build:shared
        log_success "Pacotes compilados"
    else
        log_success "Pacotes já compilados"
    fi
}

# Verificar se há migrations pendentes
check_migrations() {
    log_info "Verificando migrations..."
    
    # Simples verificação se a tabela migrations existe
    if ! docker exec foodtrack-postgres psql -U postgres -d foodtrack -c "SELECT 1 FROM migrations LIMIT 1;" &> /dev/null; then
        log_warning "Migrations não executadas. Executando..."
        pnpm migrate
        log_success "Migrations executadas"
    else
        log_success "Migrations já executadas"
    fi
}

# Mostrar status dos serviços
show_services_status() {
    echo ""
    log_info "Status dos serviços:"
    echo ""
    
    # PostgreSQL
    if docker exec foodtrack-postgres pg_isready -U postgres &> /dev/null; then
        echo -e "   🗄️  PostgreSQL: ${GREEN}Rodando${NC} (localhost:5432)"
    else
        echo -e "   🗄️  PostgreSQL: ${RED}Parado${NC}"
    fi
    
    # Redis
    if docker exec foodtrack-redis redis-cli ping &> /dev/null; then
        echo -e "   🔴 Redis: ${GREEN}Rodando${NC} (localhost:6379)"
    else
        echo -e "   🔴 Redis: ${RED}Parado${NC}"
    fi
    
    # Adminer
    if curl -f http://localhost:8082 &> /dev/null; then
        echo -e "   🔧 Adminer: ${GREEN}Rodando${NC} (http://localhost:8082)"
    else
        echo -e "   🔧 Adminer: ${RED}Parado${NC}"
    fi
    
    echo ""
}

# Iniciar desenvolvimento
start_development() {
    log_info "Iniciando ambiente de desenvolvimento..."
    echo ""
    
    log_info "🚀 Iniciando serviços..."
    log_info "   • API Gateway será iniciada na porta 4000"
    log_info "   • Cliente Web será iniciado na porta 3000"
    log_info "   • Dashboard Tenant será iniciado na porta 3001"
    echo ""
    
    log_info "📋 Para parar os serviços, pressione Ctrl+C"
    echo ""
    
    # Usar concurrently para iniciar todos os serviços
    if command -v concurrently &> /dev/null; then
        concurrently \
            --names "API,CLIENT,TENANT" \
            --prefix-colors "blue,green,yellow" \
            "pnpm dev:api" \
            "pnpm dev:client" \
            "pnpm dev:tenant"
    else
        log_warning "concurrently não encontrado. Iniciando serviços sequencialmente..."
        log_info "Inicie os outros serviços em terminais separados:"
        log_info "  Terminal 2: pnpm dev:client"
        log_info "  Terminal 3: pnpm dev:tenant"
        echo ""
        pnpm dev:api
    fi
}

# Função para cleanup ao sair
cleanup() {
    echo ""
    log_info "Parando serviços de desenvolvimento..."
    
    # Matar processos filhos
    jobs -p | xargs -r kill 2>/dev/null || true
    
    log_success "Serviços parados"
    exit 0
}

# Configurar trap para cleanup
trap cleanup SIGINT SIGTERM

# Mostrar ajuda
show_help() {
    echo "FoodTrack - Script de Desenvolvimento"
    echo ""
    echo "Uso: $0 [opção]"
    echo ""
    echo "Opções:"
    echo "  start, dev     Iniciar ambiente de desenvolvimento (padrão)"
    echo "  api           Iniciar apenas API Gateway"
    echo "  client        Iniciar apenas Cliente Web"
    echo "  tenant        Iniciar apenas Dashboard Tenant"
    echo "  status        Mostrar status dos serviços"
    echo "  logs          Mostrar logs dos serviços Docker"
    echo "  reset         Reset completo do ambiente"
    echo "  help          Mostrar esta ajuda"
    echo ""
}

# Função principal
main() {
    local command=${1:-"start"}
    
    case $command in
        "start"|"dev"|"")
            check_docker_services
            check_packages
            check_migrations
            show_services_status
            start_development
            ;;
        "api")
            check_docker_services
            check_packages
            check_migrations
            log_info "Iniciando apenas API Gateway..."
            pnpm dev:api
            ;;
        "client")
            log_info "Iniciando apenas Cliente Web..."
            pnpm dev:client
            ;;
        "tenant")
            log_info "Iniciando apenas Dashboard Tenant..."
            pnpm dev:tenant
            ;;
        "status")
            show_services_status
            ;;
        "logs")
            log_info "Mostrando logs dos serviços Docker..."
            docker-compose -f docker-compose.dev.yml logs -f
            ;;
        "reset")
            log_warning "Fazendo reset completo do ambiente..."
            docker-compose -f docker-compose.dev.yml down -v
            pnpm clean
            pnpm install
            pnpm setup
            log_success "Reset completo realizado"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Comando desconhecido: $command"
            show_help
            exit 1
            ;;
    esac
}

# Executar apenas se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi