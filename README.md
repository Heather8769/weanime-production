# WeAnime 🎌

A modern anime streaming platform built with Next.js 15, featuring a beautiful glassmorphism design and real Crunchyroll integration.

## ✨ Features

- **Modern UI/UX**: Glassmorphism design with smooth animations
- **Real Crunchyroll Integration**: Stream actual anime content
- **Performance Optimized**: Built with Next.js 15 and Turbopack
- **Responsive Design**: Works perfectly on all devices
- **Real-time Updates**: Live content updates and notifications
- **Advanced Search**: Find anime by title, genre, or year
- **User Profiles**: Personalized watchlists and preferences
- **Offline Support**: Progressive Web App capabilities

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Supabase, Python FastAPI
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Deployment**: Railway
- **Monitoring**: Custom Analytics

## 📋 Prerequisites

- Node.js 20.19.2 or later
- npm 10.0.0 or later
- Git

## 📦 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Heather8769/weanime.git
   cd weanime
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://zwvilprhyvzwcrhkyhjy.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Feature Flags
   NEXT_PUBLIC_ENABLE_REAL_CRUNCHYROLL=true
   NEXT_PUBLIC_ENABLE_MOCK_DATA=false
   NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
   NEXT_PUBLIC_ENABLE_ERROR_COLLECTION=true

   # Service URLs (for local development)
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8003
   # Crunchyroll Bridge URL is server-side only for security
   CRUNCHYROLL_BRIDGE_URL=http://localhost:8081
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment

### Railway Deployment (Recommended)

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy to staging**
   ```bash
   ./deploy-railway.sh staging
   ```

The deployment script will:
- Run pre-deployment checks
- Set up environment variables
- Deploy to Railway
- Provide deployment URLs

## 📁 Project Structure

```
weanime/
├── src/
│   ├── app/                 # Next.js 15 App Router
│   ├── components/          # Reusable React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Helper functions
├── services/
│   ├── crunchyroll-bridge/ # Rust-based Crunchyroll API bridge
│   └── backend/            # Python FastAPI backend
├── public/                 # Static assets
├── scripts/                # Deployment scripts
└── supabase/              # Database configuration
```

## 🛠️ Development Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts

## 🔒 Security & Performance

- ✅ Environment variables properly secured
- ✅ API keys never exposed to client
- ✅ TypeScript for type safety
- ✅ ESLint for code quality
- ✅ Optimized bundle size
- ✅ Core Web Vitals optimized

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Crunchyroll](https://crunchyroll.com) for anime content
- [Next.js](https://nextjs.org) for the framework
- [Supabase](https://supabase.com) for backend infrastructure
- [Railway](https://railway.app) for deployment platform

---

**WeAnime** - Bringing anime to the modern web 🎌✨
