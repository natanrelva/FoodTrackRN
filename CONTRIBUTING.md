# Contributing to FoodTrack

## Quick Setup

```bash
# Clone and setup
git clone <your-fork>
cd foodtrack
./scripts/setup.sh
pnpm dev
```

## Development Standards

### Code Style
- TypeScript everywhere
- Use Prettier and ESLint
- Follow React Hooks patterns
- Implement proper error handling

### Commit Convention
```bash
feat: add new feature
fix: bug fix
docs: documentation
refactor: code refactoring
test: add tests
chore: maintenance
```

### Pull Request Process
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test: `pnpm lint && pnpm test`
3. Commit: `git commit -m "feat: add my feature"`
4. Push and create PR

### Testing
- Minimum 80% coverage
- Test components, services, and APIs
- Use Jest and React Testing Library

## Project Structure
- `frontend/` - React applications
- `backend/` - Express API Gateway
- `packages/` - Shared TypeScript types
- `docs/` - Documentation

## Need Help?
Check existing issues or create a new one for questions.