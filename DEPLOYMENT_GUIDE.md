# WeAnime Production Deployment Guide

## 🚀 Quick Start

WeAnime supports multiple deployment configurations for development and production environments.

### Multi-Port Setup

Run WeAnime on multiple ports simultaneously:

```bash
# Start all services (ports 3000, 8000, and Crunchyroll Bridge on 8081)
npm run start:multiport

# Or start individual services
npm run start:3000     # WeAnime on port 3000
npm run start:8000     # WeAnime on port 8000  
npm run start:bridge   # Crunchyroll Bridge on port 8081
```

### Development

```bash
# Single port development
npm run dev              # Port 3000 (default)
npm run dev:3000        # Port 3000 explicitly
npm run dev:8000        # Port 8000

# Multi-port development
npm run start:multiport
```

## 🔧 Services Overview

### 1. WeAnime Frontend (Next.js)
- **Ports**: 3000, 8000
- **Purpose**: Main anime streaming interface
- **Features**: 
  - Glassmorphism UI components
  - JWT authentication
  - Real-time video streaming
  - Watchlist management

### 2. Crunchyroll Bridge (Rust)
- **Port**: 8081
- **Purpose**: Real Crunchyroll API integration
- **Features**:
  - Authentic Crunchyroll streaming
  - Session management
  - Rate limiting
  - HLS stream delivery

## 🎨 Glassmorphism Components

WeAnime includes enhanced glassmorphism UI components:

### Glass Card Variants
```tsx
import { GlassCard } from '@/components/ui/glass-card'

// Basic glass effect
<GlassCard variant="default" intensity="medium">
  Content here
</GlassCard>

// Anime-themed glass
<GlassCard variant="anime" intensity="heavy" glow animated>
  Anime content
</GlassCard>

// Premium glass
<GlassCard variant="premium" intensity="light">
  Premium features
</GlassCard>
```

### Available Variants
- `default` - Standard glass effect
- `anime` - Blue-cyan gradient for anime content
- `premium` - Purple-pink gradient for premium features
- `hero` - Large hero section glass
- `modal` - Modal overlay glass
- `navigation` - Navigation bar glass
- `player` - Video player controls glass

### Intensity Levels
- `light` - Subtle glass effect
- `medium` - Balanced glass effect (default)
- `heavy` - Strong glass effect

## 🔐 Security Features

### JWT Authentication
- Middleware-based route protection
- User session management
- Secure token handling

### Input Validation
- Comprehensive Zod schemas for all API routes
- Type-safe validation
- Error handling with detailed feedback

### Environment Security
- No hardcoded credentials
- Environment-based configuration
- Production-ready security headers

## 📊 API Validation Schemas

All API routes use comprehensive validation:

```typescript
// Watchlist operations
const watchlistAddSchema = z.object({
  animeId: animeIdSchema,
  status: z.enum(['watching', 'completed', 'on-hold', 'dropped', 'plan-to-watch']),
  currentEpisode: episodeNumberSchema.optional(),
  rating: z.number().min(0).max(10).optional(),
  notes: z.string().max(500).optional()
})

// Streaming requests
const streamingRequestSchema = z.object({
  animeId: animeIdSchema,
  episodeNumber: episodeNumberSchema,
  quality: qualitySchema,
  language: languageSchema,
  userId: z.string().uuid().optional()
})
```

## 🐳 Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run
```

## 🌐 Environment Variables

### Required
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# JWT
JWT_SECRET=your_jwt_secret

# Crunchyroll (for Bridge service)
CRUNCHYROLL_USERNAME=your_username
CRUNCHYROLL_PASSWORD=your_password
```

### Optional
```env
# Ports
PORT=3000
CRUNCHYROLL_BRIDGE_PORT=8081
CRUNCHYROLL_BRIDGE_HOST=0.0.0.0

# Features
NODE_ENV=production
RUST_LOG=info
```

## 📈 Monitoring

### Health Checks
- WeAnime: `http://localhost:3000/api/health`
- Bridge: `http://localhost:8081/health`

### Performance Monitoring
- Built-in performance metrics
- Error tracking and reporting
- Real-time system health monitoring

## 🚢 Production Deployment

### Railway (Recommended)
```bash
npm run deploy:production
```

### Manual Deployment
1. Build the application: `npm run build`
2. Start the Crunchyroll Bridge: `npm run start:bridge`
3. Start WeAnime: `npm run start:multiport`

### Load Balancing
The multi-port setup allows for:
- Load distribution across ports 3000 and 8000
- Zero-downtime deployments
- Horizontal scaling

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process using port
   lsof -ti:3000 | xargs kill -9
   ```

2. **Rust/Cargo Not Found**
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. **Environment Variables Missing**
   - Check `.env.local` file exists
   - Verify all required variables are set
   - Use `.env.example` as template

### Logs
- WeAnime logs: Available in console/terminal
- Bridge logs: Set `RUST_LOG=debug` for detailed logs
- System logs: Available through health check endpoints

## 📚 Additional Resources

- [Setup Guide](./SETUP_GUIDE.md)
- [Railway Deployment](./RAILWAY_DEPLOYMENT_GUIDE.md)
- [API Documentation](#) (Coming Soon)
- [Component Library](#) (Coming Soon)

---

**Note**: Ensure you have valid Crunchyroll credentials configured for the Bridge service to function properly. The platform prioritizes authentic streaming sources over mock data.