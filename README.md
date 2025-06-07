# Kōkai Anime - Stream, Track, Discover

A full-featured anime streaming platform with cinematic design and deep content discovery, built with Next.js and Supabase.

## 🚀 Features

- **Modern UI**: Cinematic design with smooth animations using Framer Motion
- **Authentication**: Email/password and Google OAuth via Supabase Auth
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: Full TypeScript implementation
- **Performance**: Optimized with Next.js 14 App Router

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: React Query, Zustand
- **Animations**: Framer Motion
- **Validation**: Zod

## 📋 Prerequisites

- Node.js 20.19.2 or later
- npm or yarn
- Supabase account
- Git

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kokai-anime
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   
   Create the following tables in your Supabase database:

   ```sql
   -- Profiles table
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users ON DELETE CASCADE,
     email TEXT NOT NULL,
     username TEXT,
     avatar_url TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     PRIMARY KEY (id)
   );

   -- Watchlist table
   CREATE TABLE watchlist (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users ON DELETE CASCADE,
     anime_id INTEGER NOT NULL,
     status TEXT CHECK (status IN ('watching', 'completed', 'dropped', 'plan_to_watch')) DEFAULT 'plan_to_watch',
     progress INTEGER DEFAULT 0,
     rating INTEGER CHECK (rating >= 1 AND rating <= 10),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(user_id, anime_id)
   );

   -- Watch progress table
   CREATE TABLE watch_progress (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users ON DELETE CASCADE,
     anime_id INTEGER NOT NULL,
     episode_id TEXT NOT NULL,
     episode_number INTEGER NOT NULL,
     current_time REAL DEFAULT 0,
     duration REAL DEFAULT 0,
     completed BOOLEAN DEFAULT FALSE,
     last_watched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(user_id, anime_id, episode_id)
   );

   -- Comments and reviews table
   CREATE TABLE comments (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users ON DELETE CASCADE,
     anime_id INTEGER NOT NULL,
     content TEXT NOT NULL,
     rating INTEGER CHECK (rating >= 1 AND rating <= 10),
     spoiler BOOLEAN DEFAULT FALSE,
     likes INTEGER DEFAULT 0,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
   ALTER TABLE watch_progress ENABLE ROW LEVEL SECURITY;
   ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

   -- Profiles policies
   CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
   CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

   -- Watchlist policies
   CREATE POLICY "Users can view own watchlist" ON watchlist FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "Users can update own watchlist" ON watchlist FOR UPDATE USING (auth.uid() = user_id);
   CREATE POLICY "Users can insert own watchlist" ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can delete own watchlist" ON watchlist FOR DELETE USING (auth.uid() = user_id);

   -- Watch progress policies
   CREATE POLICY "Users can view own watch progress" ON watch_progress FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "Users can update own watch progress" ON watch_progress FOR UPDATE USING (auth.uid() = user_id);
   CREATE POLICY "Users can insert own watch progress" ON watch_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can delete own watch progress" ON watch_progress FOR DELETE USING (auth.uid() = user_id);

   -- Comments policies
   CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
   CREATE POLICY "Users can insert own comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
   CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);
   ```

5. **Configure Google OAuth (optional)**
   
   In your Supabase dashboard:
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials

6. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                 # Next.js 14 App Router
│   ├── auth/           # Authentication pages
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── ui/            # Reusable UI components
│   └── ...            # Feature components
├── lib/               # Utility libraries
│   ├── auth-context.tsx
│   ├── supabase.ts
│   └── utils.ts
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## 🚧 Development Phases

### ✅ Phase 1: Setup + Auth (Complete)
- [x] Next.js project setup
- [x] Tailwind CSS configuration
- [x] Supabase integration
- [x] Authentication system
- [x] Basic UI components

### ✅ Phase 2: Metadata & Discovery (Complete)
- [x] AniList GraphQL integration
- [x] Anime search and filtering
- [x] Anime detail pages
- [x] Related anime suggestions
- [x] Trending and seasonal pages
- [x] Advanced search with filters

### ✅ Phase 3: Streaming Engine (Complete)
- [x] React Player video integration
- [x] Episode navigation and management
- [x] Watch progress tracking with Supabase
- [x] Auto-resume functionality
- [x] Skip intro/outro features
- [x] Keyboard shortcuts and controls
- [x] Fullscreen and theater mode
- [x] Quality selection and subtitles
- [x] Watch history and continue watching

### ✅ Phase 4: User Tools (Complete)
- [x] Comprehensive watchlist management
- [x] Status tracking (watching, completed, dropped, etc.)
- [x] Rating system with 10-point scale
- [x] User profile pages with statistics
- [x] Comments and reviews system
- [x] Watchlist analytics and insights
- [x] User preferences and settings
- [x] Social features foundation

### 📅 Phase 4: User Tools
- [ ] Watchlist management
- [ ] Rating system
- [ ] Comments and reviews
- [ ] User profiles

### 📅 Phase 5: Admin + Upload
- [ ] Admin dashboard
- [ ] Content management
- [ ] Analytics
- [ ] Video transcoding

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [AniList](https://anilist.co/) for anime metadata
- [Supabase](https://supabase.com/) for backend services
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Tailwind CSS](https://tailwindcss.com/) for styling
