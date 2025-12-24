# FoodTrack

**Restaurant Operating System (ROS)** - Event-driven multi-tenant platform for complete restaurant operations management.

**Tech Stack**: React 18, TypeScript, Express, PostgreSQL, Redis, Socket.IO, Event Sourcing

## Architecture

```
foodtrack/
├── frontend/                    # Client Applications
│   ├── client/                 # Customer web app (port 3000)
│   ├── tenant/                 # Restaurant dashboard (port 3001)
│   ├── kitchen/                # Kitchen interface (port 3002)
│   └── delivery/               # Delivery app (port 3003)
├── backend/                     # Backend Services
│   ├── api-gateway/            # Main API Gateway (port 4000)
│   ├── shared/                 # Shared backend utilities
│   └── migrations/             # Database migrations
├── packages/                    # Shared Libraries
│   └── types/                  # TypeScript definitions
├── docs/                       # Documentation
├── scripts/                    # Setup and utility scripts
└── .kiro/                      # Kiro specs and configurations
```

## Quick Start

**Prerequisites**: Node.js 18+, pnpm 8+, Docker

### Automated Setup (Recommended)

```bash
# Linux/macOS
./scripts/setup.sh

# Windows PowerShell
.\scripts\setup.ps1
```

### Manual Setup

```bash
# Install dependencies
pnpm install

# Start infrastructure
pnpm docker:up

# Build shared packages
pnpm build:types && pnpm build:shared

# Setup database
pnpm migrate && pnpm seed

# Start development
pnpm dev
```

## Applications & Services

| Service | URL | Description |
|---------|-----|-------------|
| **Client App** | http://localhost:3000 | Customer ordering interface |
| **Tenant Dashboard** | http://localhost:3001 | Restaurant management |
| **Kitchen Interface** | http://localhost:3002 | Production workflow |
| **Delivery App** | http://localhost:3003 | Logistics coordination |
| **API Gateway** | http://localhost:4000 | Main backend API |
| **Database Admin** | http://localhost:8082 | PostgreSQL admin (foodtrack/foodtrack123) |
| **File Storage** | http://localhost:9001 | MinIO admin (foodtrack/foodtrack123) |
| **Email Testing** | http://localhost:8025 | MailHog interface |

## Features

- **Event-Driven Architecture** with complete audit trail via Event Sourcing
- **Multi-tenant SaaS** with automatic data isolation per restaurant
- **Real-time Communication** via WebSocket for instant updates
- **Production Contract Pattern** (ADR-001) for decoupled Kitchen operations
- **JWT Authentication** with refresh tokens and role-based access
- **Responsive Design** optimized for mobile, tablet, and desktop
- **Type-safe** end-to-end with shared TypeScript definitions
- **Comprehensive Testing** with unit, integration, and E2E tests

## Development

### Available Scripts

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:api               # API Gateway only
pnpm dev:client            # Client app only
pnpm dev:tenant            # Tenant dashboard only
pnpm dev:kitchen           # Kitchen interface only
pnpm dev:delivery          # Delivery app only

# Build
pnpm build                 # Build all projects
pnpm build:types           # Build shared types
pnpm build:shared          # Build backend shared
pnpm build:backend         # Build backend services
pnpm build:frontend        # Build frontend apps

# Database
pnpm migrate               # Run migrations
pnpm migrate:reset         # Reset database
pnpm seed                  # Seed sample data
pnpm db:reset              # Reset + migrate + seed

# Infrastructure
pnpm docker:up             # Start Docker services
pnpm docker:down           # Stop Docker services
pnpm docker:logs           # View Docker logs

# Quality Assurance
pnpm lint                  # ESLint all packages
pnpm type-check            # TypeScript check
pnpm test                  # Run all tests
pnpm test:coverage         # Run tests with coverage
pnpm test:e2e              # End-to-end tests

# Utilities
pnpm clean                 # Remove build artifacts
pnpm reset                 # Clean + reinstall + setup
```

### Project Structure

```
├── packages/types/              # Shared TypeScript definitions
├── backend/
│   ├── shared/                 # Common backend utilities
│   └── api-gateway/            # Main API service
├── frontend/
│   ├── client/                 # Customer interface
│   ├── tenant/                 # Restaurant dashboard
│   ├── kitchen/                # Production workflow
│   └── delivery/               # Logistics coordination
├── docs/                       # Architecture & specifications
├── scripts/                    # Setup & utility scripts
└── .kiro/                      # Kiro specs & configurations
```

## Architecture Principles

### Event-Driven Design
- **Event Sourcing**: Complete audit trail of all business operations
- **CQRS**: Separate read/write models for optimal performance
- **Saga Pattern**: Distributed transaction coordination
- **Domain Events**: Canonical events between bounded contexts

### Multi-Tenancy
- **Hard Isolation**: Complete data separation per restaurant
- **Automatic Filtering**: Tenant context injected at middleware level
- **Scalable**: Horizontal scaling by tenant sharding

### Bounded Contexts
- **Ordering**: Order lifecycle and customer management
- **Kitchen**: Production workflow and recipe execution
- **Supply**: Inventory management and forecasting
- **Delivery**: Logistics coordination and route optimization

## Documentation

- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and patterns
- **[API Documentation](docs/API.md)** - REST endpoints and WebSocket events
- **[Development Guide](docs/DEVELOPMENT.md)** - Setup and workflow
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **[ADR-001: Production Contract](docs/ADR-001-Production-Contract.md)** - Kitchen decoupling pattern

## Contributing

1. Fork the project
2. Create feature branch: `git checkout -b feature/my-feature`
3. Follow the [Development Guide](docs/DEVELOPMENT.md)
4. Commit changes: `git commit -m 'feat: add my feature'`
5. Push and create PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.