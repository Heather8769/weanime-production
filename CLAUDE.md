# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Basic Development
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build production version
- `npm start` - Start production server
- `npm run clean` - Clean build artifacts

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run type-check` - Run TypeScript compiler check

### Testing
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report (70% threshold required)

### Database Operations
- `npm run db:generate` - Generate TypeScript types from Supabase schema
- `npm run db:reset` - Reset Supabase database
- `npm run db:migrate` - Run database migrations

### Docker & Deployment
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container
- `npm run analyze` - Analyze bundle size with webpack-bundle-analyzer

## Architecture Overview

### Core Technology Stack
- **Framework**: Next.js 15.3.3 with App Router
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth (email/password + Google OAuth)
- **State Management**: Zustand (client state) + TanStack React Query (server state)
- **Styling**: Tailwind CSS + Radix UI components
- **Video**: React Player with HLS.js for adaptive streaming

### Directory Structure Philosophy
```
src/
├── app/          # Next.js App Router pages and API routes
├── components/   # React components (UI components in ui/ subdirectory)
├── lib/          # Core utilities and configurations
├── hooks/        # Custom React hooks
└── types/        # TypeScript type definitions
```

### Database Schema
Four main tables with comprehensive relationships:
- **profiles**: User accounts with premium features
- **watchlist**: Anime tracking with status management (watching, completed, dropped, etc.)
- **watch_progress**: Episode progress for auto-resume functionality
- **comments**: Reviews and comments with voting system

### State Management Patterns
- **Zustand stores** (in `src/lib/`) for complex client state (watchlist, watch progress)
- **React Query** for all server state management with 1-minute stale time
- **Local storage persistence** for critical user data

### Component Architecture
- Uses composition pattern with Radix UI for accessibility
- UI components in `src/components/ui/` follow SHADCN conventions
- Feature components organized by domain (animations, notifications, etc.)

## API Architecture

### Internal API Routes (`src/app/api/`)
- `/api/health` - System health monitoring
- `/api/anilist` - AniList GraphQL proxy for anime metadata
- `/api/anime-streams` - Streaming service integration
- `/api/monitoring/error` - Error tracking and analytics
- `/api/analytics/performance` - Performance metrics collection

### External Integrations
- **AniList GraphQL**: Primary anime metadata source (rate-limited)
- **Multiple streaming APIs**: Fallback strategy for video content
- **Supabase**: Database, auth, and real-time features

## Key Development Patterns

### Performance Monitoring
- Custom `PerformanceMonitor` singleton class tracks Core Web Vitals
- Real-time performance metrics collection via `/api/analytics/performance`
- Bundle analysis available via `npm run analyze`

### Error Handling
- Comprehensive error boundaries in React components
- Custom error monitoring system with `/api/monitoring/error`
- Supabase Row Level Security for database-level access control

### Image Optimization
- Next.js Image component with WebP/AVIF support
- Configured remote patterns for anime image sources (AniList, Crunchyroll, MAL)
- Optimized device sizes and image sizes for responsive design

### Security Implementation
- Comprehensive security headers in `next.config.js`
- Input sanitization utilities in `src/lib/security.ts`
- HTTP-only cookies for authentication tokens
- Content Security Policy headers

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (for API routes)
```

## Testing Strategy
- Jest with Testing Library for component testing
- jsdom environment for DOM simulation
- 70% coverage threshold for branches, functions, lines, and statements
- Mock implementations for Supabase and external APIs
- Test files located in `src/components/__tests__/` or co-located with components

## Production Deployment

### Docker (Recommended for Production)
- Multi-stage Dockerfile optimized for production
- Docker Compose includes Redis and Nginx
- `output: 'standalone'` configuration for optimal Docker builds

### Vercel (Recommended for Development)
- Zero-config deployment with automatic builds
- Edge runtime support for API routes
- Built-in CDN and performance optimizations

### Environment-Specific Considerations
- Production builds require all environment variables
- Security headers are enforced in production
- Telemetry disabled in Docker builds

## Code Style and Conventions
- TypeScript strict mode enabled
- ESLint with Next.js configuration
- Tailwind utility classes with `cn()` helper from `src/lib/utils.ts`
- Component props validated with Zod schemas where applicable
- File naming: kebab-case for components, camelCase for utilities

## Streaming Architecture
- HLS.js for adaptive video streaming
- Episode auto-resume functionality via watch_progress table
- Fallback streaming services for resilience
- Quality selection and subtitle support built-in

## Performance Considerations
- React Query caching with optimized stale times
- Image lazy loading and optimization
- Code splitting via Next.js App Router
- CDN integration for static assets
- Advanced caching strategies for anime metadata