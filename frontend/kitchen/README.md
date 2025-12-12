# FoodTrack Kitchen Management System

A specialized kitchen management application optimized for restaurant operations, built with React 18, TypeScript, and TailwindCSS.

## Features

- **Kitchen Dashboard**: Central hub for managing all kitchen operations
- **Station Display System**: Individual station interfaces optimized for tablets
- **Touch-Optimized Interface**: Designed for kitchen tablet and touch screen usage
- **Real-time Integration**: WebSocket integration for live order updates
- **Multi-tenant Support**: Integrated with FoodTrack's tenant isolation system

## Development

### Prerequisites

- Node.js >=18.0.0
- pnpm >=8.0.0

### Getting Started

```bash
# Install dependencies (from workspace root)
pnpm install

# Start development server
pnpm dev:kitchen

# Or run from kitchen directory
cd frontend/kitchen
pnpm dev
```

The application will be available at http://localhost:3003

### Build

```bash
# Build for production
pnpm build

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## Architecture

### Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: TailwindCSS with touch-optimized utilities
- **UI Components**: Radix UI primitives
- **Routing**: React Router DOM
- **State Management**: React Context API

### Touch Optimization

The interface is specifically optimized for kitchen environments:

- Minimum 44px touch targets
- Touch-friendly spacing and typography
- Disabled text selection and zoom
- Large, accessible buttons and controls
- Kitchen-specific color schemes and status indicators

### Integration

- **API Gateway**: Connects to backend services via http://localhost:4000
- **WebSocket**: Real-time updates via ws://localhost:4000
- **Shared Types**: Uses @foodtrack/types for type consistency
- **Multi-tenancy**: Automatic tenant isolation via JWT middleware

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# API Gateway Configuration
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_BASE_URL=ws://localhost:4000

# Kitchen Application Configuration
VITE_APP_NAME=FoodTrack Kitchen
VITE_APP_VERSION=1.0.0

# Development Configuration
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Radix UI component library
│   └── Layout.tsx      # Main layout component
├── pages/              # Route components
│   ├── KitchenDashboard.tsx
│   └── StationDisplay.tsx
├── lib/                # Utility functions
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles and touch optimizations
```

## Routes

- `/` - Kitchen Dashboard (default)
- `/dashboard` - Kitchen Dashboard
- `/station/:stationId` - Individual Station Display

## Development Notes

- The application is designed to run on port 3003 to avoid conflicts with other FoodTrack applications
- Touch optimization includes disabled text selection and zoom prevention
- All interactive elements meet minimum touch target size requirements (44px)
- Kitchen-specific CSS classes are available for consistent styling