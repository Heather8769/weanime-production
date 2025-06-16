# WeAnime Architecture Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Next.js UI Components]
        Pages[App Router Pages]
        API[API Routes]
        PWA[PWA Service Worker]
    end
    
    subgraph "Backend Services"
        FastAPI[FastAPI Backend]
        Supabase[(Supabase)]
        Bridge[Crunchyroll Bridge]
    end
    
    subgraph "External APIs"
        AniList[AniList GraphQL]
        Jikan[Jikan REST API]
        Crunchyroll[Crunchyroll Service]
    end
    
    subgraph "Infrastructure"
        Railway[Railway Platform]
        Docker[Docker Containers]
        CDN[Image CDN]
    end
    
    UI --> Pages
    Pages --> API
    API --> FastAPI
    API --> Supabase
    API --> AniList
    API --> Jikan
    FastAPI --> Bridge
    Bridge --> Crunchyroll
    
    Railway --> Docker
    Docker --> FastAPI
    Docker --> UI
    CDN --> UI
```

## Component Relationship Diagram

```mermaid
graph TD
    subgraph "Layout Components"
        Layout[RootLayout]
        Nav[Navigation]
        Search[EnhancedSearchBar]
        UserMenu[UserMenu]
    end
    
    subgraph "Page Components"
        Home[HomePage]
        AnimePage[AnimePage]
        WatchPage[WatchPage]
        Browse[BrowsePage]
    end
    
    subgraph "Feature Components"
        Hero[HeroSection]
        AnimeCard[AnimeCard]
        VideoPlayer[VideoPlayer]
        VideoControls[VideoControls]
        EpisodeList[EpisodeList]
        WatchlistBtn[WatchlistButton]
    end
    
    subgraph "UI Components"
        Button[Button]
        Card[Card]
        AnimeImage[AnimeImage]
        Loading[Loading]
        Progress[Progress]
    end
    
    subgraph "State Management"
        WatchStore[WatchStore]
        WatchlistStore[WatchlistStore]
        AuthContext[AuthContext]
        ErrorCollector[ErrorCollector]
    end
    
    Layout --> Nav
    Nav --> Search
    Nav --> UserMenu
    
    Home --> Hero
    Home --> AnimeCard
    AnimePage --> AnimeCard
    AnimePage --> EpisodeList
    WatchPage --> VideoPlayer
    
    VideoPlayer --> VideoControls
    AnimeCard --> AnimeImage
    AnimeCard --> WatchlistBtn
    
    Button --> UI
    Card --> UI
    Loading --> UI
    
    VideoPlayer --> WatchStore
    WatchlistBtn --> WatchlistStore
    Nav --> AuthContext
    Layout --> ErrorCollector
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend
    participant API as API Routes
    participant DB as Supabase
    participant EXT as External APIs
    participant BE as FastAPI Backend
    
    U->>UI: Browse Anime
    UI->>API: /api/trending
    API->>EXT: AniList GraphQL
    EXT-->>API: Anime Data
    API->>DB: Cache Results
    API-->>UI: Formatted Data
    UI-->>U: Display Cards
    
    U->>UI: Watch Episode
    UI->>API: /api/real-stream/[id]
    API->>BE: Get Stream URL
    BE->>EXT: Crunchyroll Bridge
    EXT-->>BE: HLS Stream
    BE-->>API: Stream Data
    API-->>UI: Video Source
    UI-->>U: Play Video
```

## Authentication Flow

```mermaid
flowchart TD
    Start[User Access] --> AuthCheck{Authenticated?}
    
    AuthCheck -->|No| LoginPage[Login Page]
    AuthCheck -->|Yes| Dashboard[Dashboard]
    
    LoginPage --> LoginForm[Login Form]
    LoginForm --> AuthAPI[/api/auth/login]
    
    AuthAPI --> SupabaseAuth{Supabase Available?}
    SupabaseAuth -->|Yes| SupabaseLogin[Supabase Auth]
    SupabaseAuth -->|No| DemoAuth[Demo Authentication]
    
    SupabaseLogin --> JWT[JWT Token]
    DemoAuth --> MockJWT[Mock JWT]
    
    JWT --> SetSession[Set Session]
    MockJWT --> SetSession
    
    SetSession --> Dashboard
    Dashboard --> ProtectedRoute[Protected Routes]
    
    ProtectedRoute --> ValidateJWT{Valid JWT?}
    ValidateJWT -->|Yes| AllowAccess[Allow Access]
    ValidateJWT -->|No| RedirectLogin[Redirect to Login]
    
    RedirectLogin --> LoginPage
```

## Error Handling Architecture

```mermaid
graph LR
    subgraph "Error Sources"
        API[API Errors]
        Network[Network Errors]
        Component[Component Errors]
        Auth[Auth Errors]
    end
    
    subgraph "Error Collection"
        Boundary[Error Boundary]
        Collector[Error Collector]
        Logger[Error Logger]
    end
    
    subgraph "Error Storage"
        LocalStorage[Local Storage]
        FileSystem[File System]
        Monitoring[Monitoring API]
    end
    
    subgraph "Error Display"
        Toast[Toast Notifications]
        Modal[Error Modals]
        Fallback[Fallback UI]
    end
    
    API --> Collector
    Network --> Collector
    Component --> Boundary
    Auth --> Collector
    
    Boundary --> Logger
    Collector --> Logger
    
    Logger --> LocalStorage
    Logger --> FileSystem
    Logger --> Monitoring
    
    Logger --> Toast
    Logger --> Modal
    Boundary --> Fallback
```

## Video Streaming Architecture

```mermaid
graph TB
    subgraph "Source Selection"
        Migration[Migration Controller]
        Sources[Content Sources]
        Health[Health Checks]
    end
    
    subgraph "Primary Sources"
        Crunchyroll[Crunchyroll Bridge]
        Backend[WeAnime Backend]
        Fallback[Fallback Sources]
    end
    
    subgraph "Video Processing"
        Proxy[Video Proxy]
        CORS[CORS Handler]
        Quality[Quality Selection]
    end
    
    subgraph "Player Components"
        Player[Video Player]
        Controls[Video Controls]
        Subtitles[Subtitle System]
    end
    
    Migration --> Sources
    Sources --> Health
    Health --> Crunchyroll
    Health --> Backend
    Health --> Fallback
    
    Crunchyroll --> Proxy
    Backend --> Proxy
    Fallback --> Proxy
    
    Proxy --> CORS
    CORS --> Quality
    Quality --> Player
    
    Player --> Controls
    Player --> Subtitles
```

## Database Schema (Supabase)

```mermaid
erDiagram
    users {
        uuid id PK
        string email
        string username
        timestamp created_at
        timestamp updated_at
        jsonb preferences
    }
    
    watchlist {
        uuid id PK
        uuid user_id FK
        string anime_id
        string anime_title
        string anime_image
        timestamp added_at
        string status
    }
    
    watch_history {
        uuid id PK
        uuid user_id FK
        string anime_id
        string episode_id
        integer progress
        integer duration
        timestamp watched_at
        boolean completed
    }
    
    error_logs {
        uuid id PK
        string error_type
        string message
        jsonb stack_trace
        string user_agent
        string url
        timestamp created_at
        string severity
    }
    
    users ||--o{ watchlist : "has"
    users ||--o{ watch_history : "tracks"
    users ||--o{ error_logs : "generates"
```

## Performance Monitoring Flow

```mermaid
graph TD
    subgraph "Performance Metrics"
        PageLoad[Page Load Time]
        APIResponse[API Response Time]
        VideoLoad[Video Load Time]
        UserInteraction[User Interactions]
    end
    
    subgraph "Collection Layer"
        Monitor[Performance Monitor]
        WebVitals[Web Vitals]
        CustomMetrics[Custom Metrics]
    end
    
    subgraph "Processing"
        Analytics[Analytics API]
        Dashboard[Monitoring Dashboard]
        Alerts[Performance Alerts]
    end
    
    PageLoad --> Monitor
    APIResponse --> Monitor
    VideoLoad --> CustomMetrics
    UserInteraction --> WebVitals
    
    Monitor --> Analytics
    WebVitals --> Analytics
    CustomMetrics --> Analytics
    
    Analytics --> Dashboard
    Analytics --> Alerts
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        Dev[Local Development]
        DevEnv[.env.local]
        DevDB[Local Supabase]
    end
    
    subgraph "Staging"
        StageApp[Staging App]
        StageEnv[.env.staging]
        StageDB[Staging Database]
    end
    
    subgraph "Production"
        ProdApp[Production App]
        ProdEnv[Environment Variables]
        ProdDB[Production Database]
    end
    
    subgraph "Infrastructure"
        Railway[Railway Platform]
        Docker[Docker Containers]
        CDN[Image CDN]
        DNS[Domain Management]
    end
    
    Dev --> StageApp
    StageApp --> ProdApp
    
    DevEnv --> StageEnv
    StageEnv --> ProdEnv
    
    DevDB --> StageDB
    StageDB --> ProdDB
    
    ProdApp --> Railway
    Railway --> Docker
    Railway --> CDN
    Railway --> DNS
```

## Security Architecture

```mermaid
graph TD
    subgraph "Frontend Security"
        CSP[Content Security Policy]
        CORS[CORS Configuration]
        HTTPS[HTTPS Enforcement]
        SRI[Subresource Integrity]
    end
    
    subgraph "Authentication"
        JWT[JWT Tokens]
        Supabase[Supabase Auth]
        Session[Session Management]
        Refresh[Token Refresh]
    end
    
    subgraph "API Security"
        RateLimit[Rate Limiting]
        Validation[Input Validation]
        Sanitization[Data Sanitization]
        AuthMiddleware[Auth Middleware]
    end
    
    subgraph "Data Protection"
        Encryption[Data Encryption]
        SecureStorage[Secure Storage]
        BackupSecurity[Backup Security]
        AccessControl[Access Control]
    end
    
    CSP --> CORS
    CORS --> HTTPS
    HTTPS --> SRI
    
    JWT --> Session
    Supabase --> JWT
    Session --> Refresh
    
    RateLimit --> Validation
    Validation --> Sanitization
    Sanitization --> AuthMiddleware
    
    Encryption --> SecureStorage
    SecureStorage --> BackupSecurity
    BackupSecurity --> AccessControl
```

These diagrams provide a comprehensive overview of the WeAnime architecture, showing how all components interact and data flows through the system. Each diagram focuses on a specific aspect of the application to help understand the overall system design and identify areas for improvement.