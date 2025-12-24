#!/bin/bash

# FoodTrack Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Setting up FoodTrack development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Installing pnpm..."
        npm install -g pnpm
    fi
    
    PNPM_VERSION=$(pnpm -v | cut -d'.' -f1)
    if [ "$PNPM_VERSION" -lt 8 ]; then
        print_error "pnpm version 8+ is required. Current version: $(pnpm -v)"
        print_status "Updating pnpm..."
        npm install -g pnpm@latest
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. You'll need to set up databases manually."
    fi
    
    print_success "Requirements check completed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    pnpm install
    print_success "Dependencies installed"
}

# Setup environment files
setup_env_files() {
    print_status "Setting up environment files..."
    
    # API Gateway .env
    if [ ! -f "backend/api-gateway/.env" ]; then
        cat > backend/api-gateway/.env << EOF
# Database
DATABASE_URL=postgresql://foodtrack:foodtrack123@localhost:5432/foodtrack_dev
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=foodtrack_dev
DATABASE_USER=foodtrack
DATABASE_PASSWORD=foodtrack123

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=foodtrack123

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003

# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=foodtrack
MINIO_SECRET_KEY=foodtrack123
MINIO_BUCKET=foodtrack-uploads

# Email (Development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@foodtrack.com

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log
EOF
        print_success "Created backend/api-gateway/.env"
    else
        print_warning "backend/api-gateway/.env already exists, skipping..."
    fi
    
    # Frontend environment files
    for frontend in client tenant kitchen delivery; do
        if [ ! -f "frontend/$frontend/.env" ]; then
            cat > frontend/$frontend/.env << EOF
VITE_API_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4000
VITE_APP_NAME=FoodTrack
VITE_APP_VERSION=1.0.0
EOF
            print_success "Created frontend/$frontend/.env"
        else
            print_warning "frontend/$frontend/.env already exists, skipping..."
        fi
    done
}

# Start Docker services
start_docker_services() {
    if command -v docker &> /dev/null; then
        print_status "Starting Docker services..."
        docker-compose -f docker-compose.dev.yml up -d
        
        # Wait for services to be ready
        print_status "Waiting for services to be ready..."
        sleep 10
        
        # Check if PostgreSQL is ready
        until docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U foodtrack -d foodtrack_dev; do
            print_status "Waiting for PostgreSQL..."
            sleep 2
        done
        
        print_success "Docker services started"
    else
        print_warning "Docker not available, skipping service startup"
    fi
}

# Build shared packages
build_shared_packages() {
    print_status "Building shared packages..."
    pnpm build:types
    pnpm build:shared
    print_success "Shared packages built"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    if pnpm migrate; then
        print_success "Database migrations completed"
    else
        print_warning "Database migrations failed. Make sure PostgreSQL is running."
    fi
}

# Seed database
seed_database() {
    print_status "Seeding database with sample data..."
    if pnpm seed; then
        print_success "Database seeded with sample data"
    else
        print_warning "Database seeding failed. Make sure migrations ran successfully."
    fi
}

# Setup Git hooks
setup_git_hooks() {
    print_status "Setting up Git hooks..."
    if [ -d ".git" ]; then
        pnpm exec husky install
        print_success "Git hooks configured"
    else
        print_warning "Not a Git repository, skipping Git hooks setup"
    fi
}

# Main setup function
main() {
    echo "🍔 FoodTrack Restaurant Operating System"
    echo "========================================"
    echo ""
    
    check_requirements
    install_dependencies
    setup_env_files
    start_docker_services
    build_shared_packages
    run_migrations
    seed_database
    setup_git_hooks
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start development servers: ${GREEN}pnpm dev${NC}"
    echo "2. Open applications:"
    echo "   - Client:    ${BLUE}http://localhost:3000${NC}"
    echo "   - Tenant:    ${BLUE}http://localhost:3001${NC}"
    echo "   - Kitchen:   ${BLUE}http://localhost:3002${NC}"
    echo "   - Delivery:  ${BLUE}http://localhost:3003${NC}"
    echo "   - API:       ${BLUE}http://localhost:4000${NC}"
    echo "   - Adminer:   ${BLUE}http://localhost:8082${NC}"
    echo "   - MinIO:     ${BLUE}http://localhost:9001${NC}"
    echo "   - MailHog:   ${BLUE}http://localhost:8025${NC}"
    echo ""
    echo "3. Test credentials:"
    echo "   - Database: foodtrack / foodtrack123"
    echo "   - MinIO:    foodtrack / foodtrack123"
    echo ""
    echo "Happy coding! 🚀"
}

# Run main function
main "$@"