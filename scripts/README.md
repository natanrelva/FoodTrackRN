# FoodTrack Scripts

This directory contains utility scripts for setting up and managing the FoodTrack development environment.

## Setup Scripts

### `setup.sh` (Linux/macOS)
Complete setup script for Unix-based systems.

```bash
# Make executable and run
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### `setup.ps1` (Windows)
Complete setup script for Windows PowerShell.

```powershell
# Run in PowerShell
.\scripts\setup.ps1

# Skip Docker setup
.\scripts\setup.ps1 -SkipDocker

# Show help
.\scripts\setup.ps1 -Help
```

## What the Setup Scripts Do

1. **Check Requirements**
   - Verify Node.js 18+ is installed
   - Verify pnpm 8+ is installed
   - Check Docker availability

2. **Install Dependencies**
   - Run `pnpm install` to install all workspace dependencies

3. **Setup Environment Files**
   - Create `.env` files for all services with development defaults
   - Configure database, Redis, and other service connections

4. **Start Docker Services**
   - PostgreSQL database
   - Redis cache
   - Adminer (database admin)
   - MinIO (file storage)
   - MailHog (email testing)

5. **Build Shared Packages**
   - Build `@foodtrack/types` package
   - Build `@foodtrack/backend-shared` package

6. **Database Setup**
   - Run database migrations
   - Seed database with sample data

7. **Configure Git Hooks**
   - Setup Husky for pre-commit hooks
   - Configure lint-staged for code quality

## Manual Setup (Alternative)

If you prefer to set up manually or the scripts don't work in your environment:

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Infrastructure
```bash
# Start Docker services
pnpm docker:up

# Or manually start PostgreSQL and Redis
```

### 3. Setup Environment
```bash
# Copy example env files and modify as needed
cp backend/api-gateway/.env.example backend/api-gateway/.env
# Edit the .env file with your settings
```

### 4. Build and Setup Database
```bash
# Build shared packages
pnpm build:types
pnpm build:shared

# Setup database
pnpm migrate
pnpm seed
```

### 5. Start Development
```bash
# Start all services
pnpm dev

# Or start individually
pnpm dev:api     # API Gateway
pnpm dev:client  # Client Frontend
pnpm dev:tenant  # Tenant Dashboard
pnpm dev:kitchen # Kitchen Interface
```

## Available Services After Setup

| Service | URL | Credentials |
|---------|-----|-------------|
| Client App | http://localhost:3000 | - |
| Tenant Dashboard | http://localhost:3001 | - |
| Kitchen Interface | http://localhost:3002 | - |
| Delivery App | http://localhost:3003 | - |
| API Gateway | http://localhost:4000 | - |
| Database Admin | http://localhost:8082 | foodtrack / foodtrack123 |
| File Storage UI | http://localhost:9001 | foodtrack / foodtrack123 |
| Email Testing | http://localhost:8025 | - |

## Troubleshooting

### Port Conflicts
If you have port conflicts, you can modify the ports in:
- `docker-compose.dev.yml` for infrastructure services
- Individual `package.json` files for frontend applications
- `backend/api-gateway/.env` for the API Gateway

### Database Connection Issues
1. Make sure Docker is running
2. Check if PostgreSQL container is healthy: `docker ps`
3. Verify connection settings in `.env` files
4. Try restarting services: `pnpm docker:down && pnpm docker:up`

### Permission Issues (Linux/macOS)
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Fix Docker permissions (if needed)
sudo usermod -aG docker $USER
# Then logout and login again
```

### Windows PowerShell Execution Policy
```powershell
# If you get execution policy errors
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Development Workflow

After setup, your typical development workflow:

```bash
# Start all services
pnpm dev

# Run tests
pnpm test

# Check code quality
pnpm lint
pnpm type-check

# Reset database (when needed)
pnpm db:reset

# Clean and reinstall (when needed)
pnpm reset
```