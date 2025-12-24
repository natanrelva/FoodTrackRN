# FoodTrack Setup Script for Windows PowerShell
# This script sets up the complete development environment on Windows

param(
    [switch]$SkipDocker,
    [switch]$Help
)

if ($Help) {
    Write-Host "FoodTrack Setup Script" -ForegroundColor Green
    Write-Host "Usage: .\setup.ps1 [-SkipDocker] [-Help]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -SkipDocker    Skip Docker services setup"
    Write-Host "  -Help          Show this help message"
    exit 0
}

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if required tools are installed
function Test-Requirements {
    Write-Status "Checking requirements..."
    
    # Check Node.js version
    try {
        $nodeVersion = node --version
        $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($majorVersion -lt 18) {
            Write-Error "Node.js version 18+ is required. Current version: $nodeVersion"
            exit 1
        }
        Write-Success "Node.js version: $nodeVersion"
    }
    catch {
        Write-Error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    }
    
    # Check pnpm
    try {
        $pnpmVersion = pnpm --version
        $majorVersion = [int]($pnpmVersion -split '\.')[0]
        if ($majorVersion -lt 8) {
            Write-Warning "pnpm version 8+ is required. Current version: $pnpmVersion"
            Write-Status "Updating pnpm..."
            npm install -g pnpm@latest
        }
        Write-Success "pnpm version: $pnpmVersion"
    }
    catch {
        Write-Error "pnpm is not installed. Installing pnpm..."
        npm install -g pnpm
    }
    
    # Check Docker
    if (-not $SkipDocker) {
        try {
            docker --version | Out-Null
            Write-Success "Docker is available"
        }
        catch {
            Write-Warning "Docker is not installed. You'll need to set up databases manually."
            $script:SkipDocker = $true
        }
    }
    
    Write-Success "Requirements check completed"
}

# Install dependencies
function Install-Dependencies {
    Write-Status "Installing dependencies..."
    pnpm install
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed"
    } else {
        Write-Error "Failed to install dependencies"
        exit 1
    }
}

# Setup environment files
function Set-EnvironmentFiles {
    Write-Status "Setting up environment files..."
    
    # API Gateway .env
    $apiEnvPath = "backend\api-gateway\.env"
    if (-not (Test-Path $apiEnvPath)) {
        $apiEnvContent = @"
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
"@
        $apiEnvContent | Out-File -FilePath $apiEnvPath -Encoding UTF8
        Write-Success "Created $apiEnvPath"
    } else {
        Write-Warning "$apiEnvPath already exists, skipping..."
    }
    
    # Frontend environment files
    $frontends = @("client", "tenant", "kitchen", "delivery")
    foreach ($frontend in $frontends) {
        $envPath = "frontend\$frontend\.env"
        if (-not (Test-Path $envPath)) {
            $envContent = @"
VITE_API_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4000
VITE_APP_NAME=FoodTrack
VITE_APP_VERSION=1.0.0
"@
            $envContent | Out-File -FilePath $envPath -Encoding UTF8
            Write-Success "Created $envPath"
        } else {
            Write-Warning "$envPath already exists, skipping..."
        }
    }
}

# Start Docker services
function Start-DockerServices {
    if (-not $SkipDocker) {
        Write-Status "Starting Docker services..."
        docker-compose -f docker-compose.dev.yml up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Status "Waiting for services to be ready..."
            Start-Sleep -Seconds 10
            
            # Check if PostgreSQL is ready
            $retries = 30
            do {
                try {
                    docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U foodtrack -d foodtrack_dev
                    if ($LASTEXITCODE -eq 0) {
                        break
                    }
                }
                catch {
                    # Continue waiting
                }
                Write-Status "Waiting for PostgreSQL..."
                Start-Sleep -Seconds 2
                $retries--
            } while ($retries -gt 0)
            
            if ($retries -gt 0) {
                Write-Success "Docker services started"
            } else {
                Write-Warning "PostgreSQL may not be ready yet"
            }
        } else {
            Write-Warning "Failed to start Docker services"
        }
    } else {
        Write-Warning "Skipping Docker services startup"
    }
}

# Build shared packages
function Build-SharedPackages {
    Write-Status "Building shared packages..."
    pnpm build:types
    if ($LASTEXITCODE -eq 0) {
        pnpm build:shared
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Shared packages built"
        } else {
            Write-Error "Failed to build shared packages"
        }
    } else {
        Write-Error "Failed to build types package"
    }
}

# Run database migrations
function Invoke-Migrations {
    Write-Status "Running database migrations..."
    pnpm migrate
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database migrations completed"
    } else {
        Write-Warning "Database migrations failed. Make sure PostgreSQL is running."
    }
}

# Seed database
function Initialize-Database {
    Write-Status "Seeding database with sample data..."
    pnpm seed
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database seeded with sample data"
    } else {
        Write-Warning "Database seeding failed. Make sure migrations ran successfully."
    }
}

# Setup Git hooks
function Set-GitHooks {
    Write-Status "Setting up Git hooks..."
    if (Test-Path ".git") {
        pnpm exec husky install
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Git hooks configured"
        } else {
            Write-Warning "Failed to configure Git hooks"
        }
    } else {
        Write-Warning "Not a Git repository, skipping Git hooks setup"
    }
}

# Main setup function
function Main {
    Write-Host "🍔 FoodTrack Restaurant Operating System" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    Test-Requirements
    Install-Dependencies
    Set-EnvironmentFiles
    Start-DockerServices
    Build-SharedPackages
    Invoke-Migrations
    Initialize-Database
    Set-GitHooks
    
    Write-Host ""
    Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Start development servers: " -NoNewline
    Write-Host "pnpm dev" -ForegroundColor Green
    Write-Host "2. Open applications:"
    Write-Host "   - Client:    " -NoNewline
    Write-Host "http://localhost:3000" -ForegroundColor Blue
    Write-Host "   - Tenant:    " -NoNewline
    Write-Host "http://localhost:3001" -ForegroundColor Blue
    Write-Host "   - Kitchen:   " -NoNewline
    Write-Host "http://localhost:3002" -ForegroundColor Blue
    Write-Host "   - Delivery:  " -NoNewline
    Write-Host "http://localhost:3003" -ForegroundColor Blue
    Write-Host "   - API:       " -NoNewline
    Write-Host "http://localhost:4000" -ForegroundColor Blue
    Write-Host "   - Adminer:   " -NoNewline
    Write-Host "http://localhost:8082" -ForegroundColor Blue
    Write-Host "   - MinIO:     " -NoNewline
    Write-Host "http://localhost:9001" -ForegroundColor Blue
    Write-Host "   - MailHog:   " -NoNewline
    Write-Host "http://localhost:8025" -ForegroundColor Blue
    Write-Host ""
    Write-Host "3. Test credentials:"
    Write-Host "   - Database: foodtrack / foodtrack123"
    Write-Host "   - MinIO:    foodtrack / foodtrack123"
    Write-Host ""
    Write-Host "Happy coding! 🚀" -ForegroundColor Green
}

# Run main function
try {
    Main
}
catch {
    Write-Error "Setup failed: $($_.Exception.Message)"
    exit 1
}