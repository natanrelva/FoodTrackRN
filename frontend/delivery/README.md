# FoodTrack Delivery Logistics

Delivery logistics management application for the FoodTrack platform.

## Overview

The Delivery Logistics application provides comprehensive delivery management capabilities including:

- **Dispatch Dashboard**: Order queue management and delivery agent coordination
- **Mobile Agent Interface**: Mobile-optimized interface for delivery agents
- **Real-time Tracking**: GPS-based location tracking and route optimization
- **Performance Analytics**: Delivery metrics and performance monitoring

## Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at http://localhost:3002

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# API Configuration
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000

# Maps Integration
VITE_MAPS_API_KEY=your_maps_api_key_here

# Environment
VITE_NODE_ENV=development
```

## Architecture

### Technology Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **Radix UI** for component primitives
- **React Router** for navigation

### Integration

- **API Gateway**: Connects to FoodTrack API Gateway (localhost:4000)
- **WebSocket**: Real-time updates for delivery status and location
- **Maps API**: Integration with Google Maps or Mapbox for navigation
- **Shared Types**: Uses `@foodtrack/types` for type consistency

## Features

### Dispatch Dashboard (`/dashboard`)

- Order queue with filtering and batch assignment
- Real-time delivery agent status and location
- Interactive map with live tracking
- Performance metrics and analytics

### Mobile Agent Interface (`/mobile`)

- Order acceptance/decline workflow
- GPS navigation integration
- Pickup and delivery confirmation
- Real-time status updates

## Routes

- `/` - Redirects to dashboard
- `/dashboard` - Dispatch dashboard interface
- `/mobile` - Mobile agent interface
- `/agent` - Alias for mobile interface

## Development Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm preview          # Preview production build

# Quality
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript type checking
```

## Integration Points

### API Gateway Integration

The application integrates with the existing FoodTrack API Gateway:

- Authentication via JWT tokens
- Multi-tenant data isolation
- Order management synchronization
- Real-time WebSocket communication

### Shared Components

Utilizes the established FoodTrack component patterns:

- Radix UI component library
- TailwindCSS utility classes
- Consistent design system
- Responsive mobile-first design

## Future Enhancements

- Native mobile app (React Native)
- Advanced route optimization algorithms
- Predictive analytics for delivery times
- Integration with third-party logistics providers