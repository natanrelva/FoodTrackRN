# FoodTrack

Multi-tenant restaurant management system with real-time order processing.

**Tech Stack**: React 18, TypeScript, Express, PostgreSQL, Redis, Socket.IO

## Architecture

```
foodtrack/
├── frontend/
│   ├── client/          # Customer web app (port 3000)
│   ├── tenant/          # Restaurant dashboard (port 3001)
│   ├── kitchen/         # Kitchen interface (port 3002)
│   └── delivery/        # Delivery app (port 3003)
├── backend/
│   ├── api-gateway/     # Express API (port 4000)
│   ├── shared/          # Shared utilities
│   └── migrations/      # Database scripts
└── packages/
    └── types/           # Shared TypeScript types
```

## Quick Start

**Prerequisites**: Node.js 18+, pnpm 8+, Docker

```bash
# Clone and setup
git clone <repo-url>
cd foodtrack
./scripts/setup.sh

# Start development
pnpm dev
```

**Applications**:
- Client: http://localhost:3000
- Tenant Dashboard: http://localhost:3001  
- Kitchen: http://localhost:3002
- Delivery: http://localhost:3003
- API: http://localhost:4000
- Database Admin: http://localhost:8082

**Test Credentials**: `test@test.com` / `123456`

## Features

- **Multi-tenant architecture** with complete data isolation
- **Real-time communication** via WebSocket for order updates
- **JWT authentication** with role-based access control
- **Responsive design** optimized for mobile and desktop
- **Type-safe** end-to-end with shared TypeScript definitions

## Development

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:client            # Client app only
pnpm dev:tenant            # Tenant dashboard only
pnpm dev:api               # API Gateway only

# Build
pnpm build                 # Build all projects
pnpm build:types           # Build shared types
pnpm build:shared          # Build backend shared

# Database
pnpm migrate               # Run migrations
pnpm db:reset              # Reset database

# Quality
pnpm lint                  # ESLint
pnpm type-check            # TypeScript check
pnpm test                  # Run tests
```

## Contributing

1. Fork the project
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'feat: add my feature'`
4. Push and create PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.