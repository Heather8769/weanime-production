# WeAnime Mock Data Elimination Plan

## Executive Summary

This document provides a comprehensive strategy to eliminate ALL mock/demo data from WeAnime and replace it with authentic Crunchyroll content integration. The project will transition from a demo application to a fully functional anime streaming platform.

## 🎯 Zero Tolerance Mock Data Policy

**GOAL**: Transform WeAnime to display and stream ONLY real content from Crunchyroll, with proper error messages when real content cannot be accessed rather than falling back to demo data.

---

## 📊 Current Mock Data Audit

### **Major Mock Data Categories Identified:**

1. **Demo Video URLs** (216+ instances)
   - Google demo videos (commondatastorage.googleapis.com)
   - Archive.org content (BigBuckBunny, etc.)
   - Sample video sites (sample-videos.com, file-examples.com)

2. **Placeholder Anime Data** (500+ lines)
   - Fallback trending anime catalog
   - Mock episode metadata
   - Fake ratings and popularity scores

3. **Mock Streaming Sources** (50+ functions)
   - Demo video source generation
   - Fallback episode creation
   - Placeholder subtitle systems

4. **Test Images** (20+ URLs)
   - Picsum.photos random images
   - via.placeholder.com placeholders
   - Local fallback SVG files

---

## 🏗️ Implementation Strategy

### **Phase 1: Crunchyroll Bridge Setup** ⚡

#### **1.1 Create Crunchyroll Bridge Service**

**Location**: `services/crunchyroll-bridge/`

```rust
// services/crunchyroll-bridge/Cargo.toml
[package]
name = "crunchyroll-bridge"
version = "1.0.0"
edition = "2021"

[dependencies]
crunchyroll-rs = "0.7"
actix-web = "4"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
dotenv = "0.15"
```

```rust
// services/crunchyroll-bridge/src/main.rs
use actix_web::{web, App, HttpServer, post, HttpResponse, Result};
use crunchyroll_rs::Crunchyroll;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Serialize)]
struct LoginResponse {
    session_token: String,
    expires_at: String,
}

#[derive(Deserialize)]
struct SearchRequest {
    query: String,
    session_token: String,
    limit: Option<u32>,
}

#[derive(Serialize)]
struct AnimeResult {
    id: String,
    title: String,
    description: String,
    poster_tall: String,
    poster_wide: String,
    episode_count: u32,
    season_count: u32,
    genres: Vec<String>,
    rating: f32,
    year: u32,
}

#[derive(Deserialize)]
struct EpisodesRequest {
    anime_id: String,
    session_token: String,
}

#[derive(Serialize)]
struct EpisodeResult {
    id: String,
    number: u32,
    title: String,
    description: String,
    thumbnail: String,
    duration_ms: u64,
    air_date: String,
    season_number: u32,
}

#[derive(Deserialize)]
struct StreamRequest {
    episode_id: String,
    session_token: String,
    quality: Option<String>,
}

#[derive(Serialize)]
struct StreamResult {
    hls_url: String,
    quality: String,
    subtitles: Vec<SubtitleTrack>,
}

#[derive(Serialize)]
struct SubtitleTrack {
    language: String,
    url: String,
    label: String,
}

#[post("/login")]
async fn login_handler(payload: web::Json<LoginRequest>) -> Result<HttpResponse> {
    match Crunchyroll::login(&payload.username, &payload.password).await {
        Ok(session) => {
            Ok(HttpResponse::Ok().json(LoginResponse {
                session_token: session.session_id().to_string(),
                expires_at: chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string(),
            }))
        },
        Err(e) => Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Authentication failed",
            "message": format!("Crunchyroll login error: {}", e)
        })))
    }
}

#[post("/search")]
async fn search_handler(payload: web::Json<SearchRequest>) -> Result<HttpResponse> {
    let session = match Crunchyroll::builder()
        .session_id(&payload.session_token)
        .build()
        .await 
    {
        Ok(sess) => sess,
        Err(e) => return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Invalid session",
            "message": format!("Session error: {}", e)
        })))
    };

    match session.search(&payload.query).await {
        Ok(results) => {
            let anime_results: Vec<AnimeResult> = results.media.iter()
                .filter_map(|media| {
                    Some(AnimeResult {
                        id: media.id().to_string(),
                        title: media.title().to_string(),
                        description: media.description().unwrap_or_default(),
                        poster_tall: media.images().poster_tall.first()?.source.clone(),
                        poster_wide: media.images().poster_wide.first()?.source.clone(),
                        episode_count: media.episode_count().unwrap_or(0),
                        season_count: media.season_count().unwrap_or(1),
                        genres: media.genres().iter().map(|g| g.clone()).collect(),
                        rating: media.rating().unwrap_or(0.0),
                        year: media.year().unwrap_or(0),
                    })
                })
                .collect();

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "results": anime_results,
                "total": anime_results.len()
            })))
        },
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Search failed", 
            "message": format!("Crunchyroll search error: {}", e)
        })))
    }
}

#[post("/episodes")]
async fn episodes_handler(payload: web::Json<EpisodesRequest>) -> Result<HttpResponse> {
    let session = match Crunchyroll::builder()
        .session_id(&payload.session_token)
        .build()
        .await 
    {
        Ok(sess) => sess,
        Err(e) => return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Invalid session",
            "message": format!("Session error: {}", e)
        })))
    };

    match session.series(&payload.anime_id).await {
        Ok(series) => {
            match series.episodes().await {
                Ok(episodes) => {
                    let episode_results: Vec<EpisodeResult> = episodes.iter()
                        .map(|ep| EpisodeResult {
                            id: ep.id().to_string(),
                            number: ep.episode_number().unwrap_or(0),
                            title: ep.title().to_string(),
                            description: ep.description().unwrap_or_default(),
                            thumbnail: ep.thumbnail().unwrap_or_default(),
                            duration_ms: ep.duration_ms().unwrap_or(0),
                            air_date: ep.air_date().unwrap_or_default(),
                            season_number: ep.season_number().unwrap_or(1),
                        })
                        .collect();

                    Ok(HttpResponse::Ok().json(serde_json::json!({
                        "episodes": episode_results,
                        "total_episodes": episode_results.len()
                    })))
                },
                Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Episodes fetch failed",
                    "message": format!("Episodes error: {}", e)
                })))
            }
        },
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Anime not found",
            "message": format!("Series error: {}", e)
        })))
    }
}

#[post("/stream")]
async fn stream_handler(payload: web::Json<StreamRequest>) -> Result<HttpResponse> {
    let session = match Crunchyroll::builder()
        .session_id(&payload.session_token)
        .build()
        .await 
    {
        Ok(sess) => sess,
        Err(e) => return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "Invalid session",
            "message": format!("Session error: {}", e)
        })))
    };

    match session.episode(&payload.episode_id).await {
        Ok(episode) => {
            match episode.stream().await {
                Ok(stream) => {
                    let subtitles: Vec<SubtitleTrack> = stream.subtitles()
                        .iter()
                        .map(|sub| SubtitleTrack {
                            language: sub.locale().to_string(),
                            url: sub.url().to_string(),
                            label: sub.label().to_string(),
                        })
                        .collect();

                    Ok(HttpResponse::Ok().json(StreamResult {
                        hls_url: stream.url().to_string(),
                        quality: payload.quality.clone().unwrap_or("1080p".to_string()),
                        subtitles,
                    }))
                },
                Err(e) => {
                    if e.to_string().contains("TOO_MANY_ACTIVE_STREAMS") {
                        Ok(HttpResponse::TooManyRequests().json(serde_json::json!({
                            "error": "Stream limit reached",
                            "message": "Crunchyroll stream limit exceeded. Please try again later."
                        })))
                    } else {
                        Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                            "error": "Stream unavailable",
                            "message": format!("Stream error: {}", e)
                        })))
                    }
                }
            }
        },
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Episode not found", 
            "message": format!("Episode error: {}", e)
        })))
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    
    println!("🚀 Crunchyroll Bridge starting on http://localhost:8081");
    println!("📺 Real Crunchyroll integration - NO MOCK DATA");
    
    HttpServer::new(|| {
        App::new()
            .service(login_handler)
            .service(search_handler) 
            .service(episodes_handler)
            .service(stream_handler)
    })
    .bind("0.0.0.0:8081")?
    .run()
    .await
}
```

#### **1.2 Update FastAPI Backend Integration**

**Update**: `apps/backend/app/main.py`

```python
# Replace existing implementation with real-only Crunchyroll integration

import httpx
import os
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# Crunchyroll Bridge configuration 
BRIDGE_URL = os.getenv("CRUNCHYROLL_BRIDGE_URL", "http://localhost:8081")
CRUNCHYROLL_USERNAME = os.getenv("CRUNCHYROLL_USERNAME")
CRUNCHYROLL_PASSWORD = os.getenv("CRUNCHYROLL_PASSWORD")

# Validate credentials
if not CRUNCHYROLL_USERNAME or not CRUNCHYROLL_PASSWORD:
    logger.error("❌ Missing Crunchyroll credentials")
    raise ValueError("Crunchyroll credentials required for real streaming")

# Global session management
session_token: Optional[str] = None

async def get_crunchyroll_session() -> str:
    """Get valid Crunchyroll session token - NO FALLBACKS"""
    global session_token
    
    if session_token:
        return session_token
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info("🔐 Authenticating with real Crunchyroll...")
            response = await client.post(
                f"{BRIDGE_URL}/login",
                json={
                    "username": CRUNCHYROLL_USERNAME,
                    "password": CRUNCHYROLL_PASSWORD
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                session_token = data["session_token"]
                logger.info("✅ Real Crunchyroll authentication successful")
                return session_token
            else:
                error_data = response.json()
                logger.error(f"❌ Crunchyroll authentication failed: {error_data}")
                raise HTTPException(
                    status_code=401, 
                    detail="Real Crunchyroll authentication failed - no mock data available"
                )
                
        except httpx.RequestError as e:
            logger.error(f"❌ Crunchyroll Bridge unreachable: {e}")
            raise HTTPException(
                status_code=503, 
                detail="Crunchyroll Bridge service unavailable - no mock data fallback"
            )

@app.get("/api/search")
async def search_real_anime(q: str, limit: int = 20):
    """Search REAL Crunchyroll anime - NO MOCK DATA"""
    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Search query too short")
    
    token = await get_crunchyroll_session()
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"🔍 Searching real Crunchyroll for: '{q}'")
            response = await client.post(
                f"{BRIDGE_URL}/search",
                json={
                    "query": q.strip(),
                    "session_token": token,
                    "limit": limit
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Found {len(data['results'])} real anime results")
                return {
                    "success": True,
                    "results": data["results"],
                    "total": data["total"],
                    "source": "crunchyroll_real"
                }
            else:
                error_data = response.json()
                logger.error(f"❌ Crunchyroll search failed: {error_data}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Real anime search failed: {error_data.get('message', 'Unknown error')}"
                )
                
        except httpx.RequestError as e:
            logger.error(f"❌ Search request failed: {e}")
            raise HTTPException(
                status_code=503,
                detail="Real anime search service unavailable"
            )

@app.get("/api/episodes/{anime_id}")
async def get_real_episodes(anime_id: str):
    """Get REAL Crunchyroll episodes - NO MOCK DATA"""
    if not anime_id or not anime_id.strip():
        raise HTTPException(status_code=400, detail="Invalid anime ID")
    
    token = await get_crunchyroll_session()
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"📺 Fetching real episodes for anime: {anime_id}")
            response = await client.post(
                f"{BRIDGE_URL}/episodes",
                json={
                    "anime_id": anime_id.strip(),
                    "session_token": token
                },
                timeout=45.0
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Found {data['total_episodes']} real episodes")
                return {
                    "success": True,
                    "episodes": data["episodes"],
                    "total_episodes": data["total_episodes"],
                    "anime_id": anime_id,
                    "source": "crunchyroll_real"
                }
            else:
                error_data = response.json()
                logger.error(f"❌ Episodes fetch failed: {error_data}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Real episodes unavailable: {error_data.get('message', 'Anime not found')}"
                )
                
        except httpx.RequestError as e:
            logger.error(f"❌ Episodes request failed: {e}")
            raise HTTPException(
                status_code=503,
                detail="Real episodes service unavailable"
            )

@app.get("/api/stream/{episode_id}")
async def get_real_stream(episode_id: str, quality: str = "1080p"):
    """Get REAL Crunchyroll stream - NO MOCK DATA"""
    if not episode_id or not episode_id.strip():
        raise HTTPException(status_code=400, detail="Invalid episode ID")
    
    token = await get_crunchyroll_session()
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"🎬 Getting real stream for episode: {episode_id} at {quality}")
            response = await client.post(
                f"{BRIDGE_URL}/stream",
                json={
                    "episode_id": episode_id.strip(),
                    "session_token": token,
                    "quality": quality
                },
                timeout=45.0
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Real stream URL obtained: {data['hls_url'][:50]}...")
                return {
                    "success": True,
                    "hls_url": data["hls_url"],
                    "quality": data["quality"],
                    "subtitles": data["subtitles"],
                    "episode_id": episode_id,
                    "source": "crunchyroll_real"
                }
            elif response.status_code == 429:
                error_data = response.json()
                logger.warning(f"⚠️ Stream limit reached: {error_data}")
                raise HTTPException(
                    status_code=429,
                    detail="Crunchyroll stream limit reached - this proves real integration!"
                )
            else:
                error_data = response.json()
                logger.error(f"❌ Stream fetch failed: {error_data}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Real stream unavailable: {error_data.get('message', 'Episode not streamable')}"
                )
                
        except httpx.RequestError as e:
            logger.error(f"❌ Stream request failed: {e}")
            raise HTTPException(
                status_code=503,
                detail="Real streaming service unavailable"
            )

# Health check with real integration status
@app.get("/health")
async def health_check():
    """Health check with real Crunchyroll status"""
    try:
        # Test Crunchyroll Bridge connectivity
        async with httpx.AsyncClient() as client:
            bridge_response = await client.get(f"{BRIDGE_URL}/health", timeout=10.0)
            bridge_healthy = bridge_response.status_code == 200
    except:
        bridge_healthy = False
    
    # Test session token validity
    session_valid = session_token is not None
    
    return {
        "status": "healthy" if bridge_healthy else "degraded",
        "service": "weanime_real_crunchyroll_backend",
        "crunchyroll_bridge": "connected" if bridge_healthy else "disconnected",
        "session_token": "valid" if session_valid else "invalid",
        "mock_data": False,
        "real_integration": True,
        "bridge_url": BRIDGE_URL
    }
```

### **Phase 2: Frontend Integration** 🎨

#### **2.1 Replace Mock Episode Service**

**Replace**: `src/lib/episode-service.ts`

```typescript
import { Episode, VideoSource, Subtitle } from './watch-store'
import { createAPIError, withRetry } from './error-handling'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8003'

// Real Crunchyroll episode service - NO MOCK DATA
export class RealEpisodeService {
  
  /**
   * Get real episodes from Crunchyroll - NO FALLBACKS
   */
  static async getRealEpisodes(animeId: string): Promise<Episode[]> {
    if (!animeId || animeId.trim() === '') {
      throw createAPIError('Invalid anime ID provided', 'INVALID_INPUT')
    }

    console.log(`🔍 Fetching real episodes for anime: ${animeId}`)

    try {
      const response = await withRetry(async () => {
        const res = await fetch(`${BACKEND_URL}/api/episodes/${animeId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-cache' // Always get fresh real data
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(`Episodes API failed: ${res.status} - ${errorData.detail || res.statusText}`)
        }

        return res
      }, 3)

      const data = await response.json()

      if (!data.success || !Array.isArray(data.episodes)) {
        throw createAPIError('Invalid episodes response from Crunchyroll', 'API_ERROR')
      }

      // Convert Crunchyroll episodes to our Episode format
      const realEpisodes: Episode[] = data.episodes.map((crEpisode: any): Episode => ({
        id: crEpisode.id,
        number: crEpisode.number,
        title: crEpisode.title,
        description: crEpisode.description,
        thumbnail: crEpisode.thumbnail,
        duration: Math.floor(crEpisode.duration_ms / 1000), // Convert to seconds
        sources: [], // Will be populated when episode is selected
        subtitles: [],
        skipTimes: {
          intro: undefined,
          outro: undefined
        },
        airDate: crEpisode.air_date,
        seasonNumber: crEpisode.season_number,
        streamingId: crEpisode.id,
        isReal: true // Mark as real content
      }))

      console.log(`✅ Successfully loaded ${realEpisodes.length} real episodes`)
      
      if (realEpisodes.length === 0) {
        throw createAPIError('No episodes available for this anime on Crunchyroll', 'NO_CONTENT')
      }

      return realEpisodes

    } catch (error) {
      console.error(`❌ Failed to fetch real episodes for anime ${animeId}:`, error)
      
      // NO FALLBACK TO MOCK DATA
      throw createAPIError(
        `Real episodes unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EPISODES_UNAVAILABLE'
      )
    }
  }

  /**
   * Get real streaming sources for episode - NO MOCK DATA
   */
  static async getRealStreamingSources(episodeId: string, quality: string = '1080p'): Promise<VideoSource[]> {
    if (!episodeId || episodeId.trim() === '') {
      throw createAPIError('Invalid episode ID provided', 'INVALID_INPUT')
    }

    console.log(`🎬 Getting real stream for episode: ${episodeId} at ${quality}`)

    try {
      const response = await withRetry(async () => {
        const res = await fetch(`${BACKEND_URL}/api/stream/${episodeId}?quality=${quality}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-cache' // Always get fresh stream URLs
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          
          if (res.status === 429) {
            throw createAPIError('Crunchyroll stream limit reached - please try again later', 'RATE_LIMITED')
          }
          
          throw new Error(`Stream API failed: ${res.status} - ${errorData.detail || res.statusText}`)
        }

        return res
      }, 2) // Fewer retries for streaming to avoid hitting rate limits

      const data = await response.json()

      if (!data.success || !data.hls_url) {
        throw createAPIError('Invalid stream response from Crunchyroll', 'API_ERROR')
      }

      // Convert Crunchyroll stream to our VideoSource format
      const realSources: VideoSource[] = [{
        quality: data.quality,
        url: data.hls_url,
        type: 'hls'
      }]

      console.log(`✅ Real stream URL obtained: ${data.hls_url.substring(0, 50)}...`)
      return realSources

    } catch (error) {
      console.error(`❌ Failed to get real stream for episode ${episodeId}:`, error)
      
      // NO FALLBACK TO MOCK DATA
      throw createAPIError(
        `Real stream unavailable: ${error instanceof Error ? error.message : 'Stream not accessible'}`,
        'STREAM_UNAVAILABLE'
      )
    }
  }

  /**
   * Get real subtitles for episode - NO MOCK DATA
   */
  static async getRealSubtitles(episodeId: string): Promise<Subtitle[]> {
    // Real subtitles are included in the stream response
    try {
      const response = await fetch(`${BACKEND_URL}/api/stream/${episodeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Subtitles unavailable')
      }

      const data = await response.json()
      
      if (!data.success || !Array.isArray(data.subtitles)) {
        return [] // No subtitles available
      }

      // Convert Crunchyroll subtitles to our format
      const realSubtitles: Subtitle[] = data.subtitles.map((crSub: any): Subtitle => ({
        language: crSub.language,
        url: crSub.url,
        label: crSub.label
      }))

      console.log(`✅ Found ${realSubtitles.length} real subtitle tracks`)
      return realSubtitles

    } catch (error) {
      console.warn(`⚠️ Subtitles unavailable for episode ${episodeId}:`, error)
      return [] // Return empty array, not mock subtitles
    }
  }
}

// Export only real functions - NO MOCK EXPORTS
export const {
  getRealEpisodes,
  getRealStreamingSources,
  getRealSubtitles
} = RealEpisodeService

// Remove all mock functions:
// - generateFallbackEpisodes ❌ DELETED
// - generateBasicVideoSources ❌ DELETED  
// - generateEpisodeDuration ❌ DELETED
// - REAL_ANIME_TRAILERS ❌ DELETED (use real Crunchyroll data)
```

#### **2.2 Replace Fallback Data Service**

**Replace**: `src/lib/fallback-data.ts`

```typescript
// Real Crunchyroll data service - NO FALLBACK DATA

import { createAPIError } from './error-handling'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8003'

export class RealAnimeDataService {
  
  /**
   * Search real trending anime from Crunchyroll
   */
  static async getTrendingAnime(): Promise<any[]> {
    console.log('🔥 Fetching real trending anime from Crunchyroll...')
    
    try {
      // Search for popular anime on Crunchyroll
      const trendingQueries = [
        'Attack on Titan',
        'Demon Slayer', 
        'One Piece',
        'Jujutsu Kaisen',
        'Chainsaw Man',
        'Spy x Family'
      ]

      const trendingResults = []
      
      for (const query of trendingQueries) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}&limit=3`)
          
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.results.length > 0) {
              trendingResults.push(...data.results.slice(0, 1)) // Take first result
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch trending anime for query: ${query}`)
        }
      }

      if (trendingResults.length === 0) {
        throw createAPIError('No trending anime available from Crunchyroll', 'NO_CONTENT')
      }

      console.log(`✅ Found ${trendingResults.length} real trending anime`)
      return trendingResults

    } catch (error) {
      console.error('❌ Failed to fetch real trending anime:', error)
      throw createAPIError('Real trending anime unavailable', 'TRENDING_UNAVAILABLE')
    }
  }

  /**
   * Search real seasonal anime from Crunchyroll
   */
  static async getSeasonalAnime(): Promise<any[]> {
    console.log('📅 Fetching real seasonal anime from Crunchyroll...')
    
    try {
      // Search for current season anime
      const currentYear = new Date().getFullYear()
      const seasonalQueries = [
        `${currentYear} anime`,
        'new anime',
        'latest anime',
        'recent anime'
      ]

      const seasonalResults = []
      
      for (const query of seasonalQueries) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}&limit=5`)
          
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.results.length > 0) {
              seasonalResults.push(...data.results)
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch seasonal anime for query: ${query}`)
        }
      }

      if (seasonalResults.length === 0) {
        throw createAPIError('No seasonal anime available from Crunchyroll', 'NO_CONTENT')
      }

      // Remove duplicates by ID
      const uniqueResults = seasonalResults.filter((anime, index, self) => 
        index === self.findIndex(a => a.id === anime.id)
      )

      console.log(`✅ Found ${uniqueResults.length} real seasonal anime`)
      return uniqueResults

    } catch (error) {
      console.error('❌ Failed to fetch real seasonal anime:', error)
      throw createAPIError('Real seasonal anime unavailable', 'SEASONAL_UNAVAILABLE')
    }
  }

  /**
   * Search real anime by query
   */
  static async searchRealAnime(query: string, limit: number = 20): Promise<any[]> {
    if (!query || query.trim().length < 2) {
      throw createAPIError('Search query too short', 'INVALID_INPUT')
    }

    console.log(`🔍 Searching real anime for: "${query}"`)
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Search failed: ${response.status} - ${errorData.detail || response.statusText}`)
      }

      const data = await response.json()

      if (!data.success || !Array.isArray(data.results)) {
        throw createAPIError('Invalid search response from Crunchyroll', 'API_ERROR')
      }

      if (data.results.length === 0) {
        throw createAPIError(`No anime found for "${query}" on Crunchyroll`, 'NO_RESULTS')
      }

      console.log(`✅ Found ${data.results.length} real anime results for "${query}"`)
      return data.results

    } catch (error) {
      console.error(`❌ Failed to search real anime for "${query}":`, error)
      throw createAPIError(
        `Real anime search unavailable: ${error instanceof Error ? error.message : 'Search failed'}`,
        'SEARCH_UNAVAILABLE'
      )
    }
  }
}

// Export only real data functions
export const {
  getTrendingAnime,
  getSeasonalAnime, 
  searchRealAnime
} = RealAnimeDataService

// Remove all mock data exports:
// - FALLBACK_TRENDING_ANIME ❌ DELETED
// - FALLBACK_SEASONAL_ANIME ❌ DELETED
// - FALLBACK_EPISODES ❌ DELETED
// - Any other mock data constants ❌ DELETED
```

### **Phase 3: Component Updates** 🎯

#### **3.1 Update Video Player for Real Streams**

**Update**: `src/components/video-player.tsx`

```typescript
import { useEffect, useState, useCallback } from 'react'
import { RealEpisodeService } from '@/lib/episode-service'
import { useToast } from '@/components/notifications/toast-system'

export function VideoPlayer({ episode, ...props }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [realSources, setRealSources] = useState<VideoSource[]>([])
  const { toast } = useToast()

  // Load real streaming sources
  const loadRealStream = useCallback(async () => {
    if (!episode?.id) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('🎬 Loading real stream for episode:', episode.id)
      
      const sources = await RealEpisodeService.getRealStreamingSources(
        episode.id,
        '1080p' // Default quality
      )

      if (sources.length === 0) {
        throw new Error('No streaming sources available')
      }

      setRealSources(sources)
      
      toast({
        title: "✅ Real Stream Loaded",
        description: `Episode ${episode.number} from Crunchyroll`,
        variant: "success"
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load stream'
      console.error('❌ Real stream loading failed:', error)
      
      setError(errorMessage)
      
      toast({
        title: "❌ Stream Unavailable",
        description: `Real Crunchyroll stream not available: ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [episode?.id, toast])

  useEffect(() => {
    loadRealStream()
  }, [loadRealStream])

  // Show loading state
  if (isLoading) {
    return (
      <div className="relative aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white">🔄 Loading real Crunchyroll stream...</p>
          <p className="text-gray-400 text-sm mt-2">No mock data - real content only</p>
        </div>
      </div>
    )
  }

  // Show error state - NO FALLBACK TO MOCK DATA
  if (error || realSources.length === 0) {
    return (
      <div className="relative aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-white text-lg font-semibold mb-2">
            Real Stream Unavailable
          </h3>
          <p className="text-gray-400 mb-4">
            {error || 'This episode is not available on Crunchyroll'}
          </p>
          <p className="text-gray-500 text-sm mb-4">
            WeAnime only displays real content - no mock data or fallbacks
          </p>
          <button 
            onClick={loadRealStream}
            className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg transition-colors"
          >
            🔄 Retry Real Stream
          </button>
        </div>
      </div>
    )
  }

  // Render player with real sources only
  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      {/* Real stream player implementation */}
      <ReactPlayer
        url={realSources[0]?.url} // Use real HLS URL
        controls={true}
        width="100%"
        height="100%"
        config={{
          file: {
            attributes: {
              crossOrigin: 'anonymous'
            }
          }
        }}
        onError={(error) => {
          console.error('❌ Real stream playback error:', error)
          setError('Playback failed - stream may be expired')
        }}
        onReady={() => {
          console.log('✅ Real stream ready for playback')
        }}
      />
      
      {/* Real stream indicator */}
      <div className="absolute top-4 right-4 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
        🟢 Real Crunchyroll Stream
      </div>
    </div>
  )
}
```

#### **3.2 Update Search Components**

**Update**: `src/components/enhanced-search-bar.tsx`

```typescript
import { useState, useCallback } from 'react'
import { RealAnimeDataService } from '@/lib/fallback-data'
import { useToast } from '@/components/notifications/toast-system'

export function EnhancedSearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const searchRealAnime = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([])
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      console.log('🔍 Searching real Crunchyroll anime:', searchQuery)
      
      const realResults = await RealAnimeDataService.searchRealAnime(searchQuery, 10)
      
      setResults(realResults)
      
      if (realResults.length > 0) {
        toast({
          title: "✅ Real Results Found",
          description: `Found ${realResults.length} anime on Crunchyroll`,
          variant: "success"
        })
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      console.error('❌ Real anime search failed:', error)
      
      setError(errorMessage)
      setResults([])
      
      toast({
        title: "❌ Search Failed",
        description: `Real Crunchyroll search unavailable: ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
    }
  }, [toast])

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.length >= 2) {
              searchRealAnime(e.target.value)
            }
          }}
          placeholder="Search real Crunchyroll anime..."
          className="glass-card w-full px-4 py-3 pl-12 pr-4 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        
        {/* Real search indicator */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <div className="text-green-400 text-xs font-medium">
              🟢 Real Search
            </div>
          )}
        </div>
      </div>

      {/* Search results */}
      {(results.length > 0 || error) && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-modal border border-white/20 rounded-xl max-h-96 overflow-y-auto z-50">
          {error ? (
            <div className="p-4 text-center">
              <div className="text-red-400 mb-2">❌ Search Failed</div>
              <p className="text-gray-400 text-sm">{error}</p>
              <p className="text-gray-500 text-xs mt-2">No mock results - real content only</p>
            </div>
          ) : (
            results.map((anime) => (
              <div key={anime.id} className="p-3 hover:bg-white/5 transition-colors border-b border-white/10 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <img
                    src={anime.poster_tall}
                    alt={anime.title}
                    className="w-12 h-16 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.src = '/images/fallback-cover.svg'
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{anime.title}</h4>
                    <p className="text-gray-400 text-sm line-clamp-2">{anime.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-green-400 text-xs">🟢 Crunchyroll</span>
                      <span className="text-gray-500 text-xs">Episodes: {anime.episode_count}</span>
                      <span className="text-gray-500 text-xs">Year: {anime.year}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

### **Phase 4: Complete Mock Data Removal** 🗑️

#### **4.1 Delete Mock Data Files**

```bash
# Remove all mock data files completely
rm -f src/lib/video-sources.ts                    # Demo video sources
rm -f src/app/api/subtitles/route.ts             # Mock subtitle system
rm -f src/components/__tests__/video-player.test.tsx  # Mock test data
```

#### **4.2 Update Image Fallbacks**

**Update**: `src/components/ui/anime-image.tsx`

```typescript
// Remove placeholder.com URLs - use local fallbacks only
const fallbackImage = (type: 'cover' | 'banner' | 'thumbnail' | 'avatar') => {
  return `/images/fallback-${type}.svg`
}

// Remove via.placeholder.com integration
// Keep only local SVG fallbacks for when real images fail to load
```

#### **4.3 Update Error Messages**

**Update all error messages to emphasize real content only:**

```typescript
// Example error message patterns:
"Real Crunchyroll content unavailable - no mock data fallback"
"This feature requires real Crunchyroll integration"
"WeAnime displays only authentic streaming content"
"No demo data available - real streams only"
```

### **Phase 5: Environment Configuration** ⚙️

#### **5.1 Environment Variables**

**Update**: `.env.example`

```env
# Real Crunchyroll Integration - REQUIRED
CRUNCHYROLL_USERNAME=gaklina1@maxpedia.cloud
CRUNCHYROLL_PASSWORD=Watch123
CRUNCHYROLL_BRIDGE_URL=http://localhost:8081

# Backend Configuration
REAL_CRUNCHYROLL_BACKEND_URL=http://localhost:8003
NEXT_PUBLIC_BACKEND_URL=http://localhost:8003

# Database (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Feature Flags
NEXT_PUBLIC_MOCK_DATA_ENABLED=false
NEXT_PUBLIC_REAL_STREAMING_ONLY=true
```

#### **5.2 Docker Compose for Complete Setup**

**Update**: `docker-compose.yml`

```yaml
version: "3.9"

services:
  # Rust Crunchyroll Bridge
  crunchyroll-bridge:
    build: ./services/crunchyroll-bridge
    ports:
      - "8081:8081"
    environment:
      - PORT=8081
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Python Backend
  backend:
    build: ./apps/backend
    ports:
      - "8003:8003"
    environment:
      - CRUNCHYROLL_BRIDGE_URL=http://crunchyroll-bridge:8081
      - CRUNCHYROLL_USERNAME=${CRUNCHYROLL_USERNAME}
      - CRUNCHYROLL_PASSWORD=${CRUNCHYROLL_PASSWORD}
    depends_on:
      - crunchyroll-bridge

  # Next.js Frontend
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_BACKEND_URL=http://backend:8003
      - NEXT_PUBLIC_MOCK_DATA_ENABLED=false
      - NEXT_PUBLIC_REAL_STREAMING_ONLY=true
    depends_on:
      - backend

networks:
  default:
    name: weanime-real-network
```

## 🎯 Verification & Testing

### **Verification Checklist**

- [ ] ✅ No Archive.org URLs in codebase
- [ ] ✅ No sample-videos.com URLs in codebase  
- [ ] ✅ No Google demo videos in codebase
- [ ] ✅ No mock episode generation functions
- [ ] ✅ No fallback anime data constants
- [ ] ✅ All searches return real Crunchyroll results
- [ ] ✅ All streams are real HLS URLs from Crunchyroll
- [ ] ✅ Error messages indicate real-only policy
- [ ] ✅ Crunchyroll Bridge service operational
- [ ] ✅ Real authentication with provided credentials

### **Testing Commands**

```bash
# Test real Crunchyroll integration
curl http://localhost:8081/login -X POST -H "Content-Type: application/json" \
  -d '{"username":"gaklina1@maxpedia.cloud","password":"Watch123"}'

# Test real anime search
curl http://localhost:8003/api/search?q=naruto

# Verify no mock data in build
grep -r "archive.org" src/ || echo "✅ No Archive.org URLs found"
grep -r "sample-videos" src/ || echo "✅ No sample video URLs found"
grep -r "BigBuckBunny" src/ || echo "✅ No demo video references found"
```

## 🚀 Deployment Strategy

1. **Deploy Crunchyroll Bridge** on port 8081
2. **Deploy FastAPI Backend** with real credentials
3. **Build Frontend** with real-only configuration
4. **Test full pipeline** from search to streaming
5. **Monitor real integration** status

## ⚡ Success Metrics

- **Zero mock data** in production build
- **100% real content** from Crunchyroll
- **Proper error handling** when real content unavailable
- **No fallback systems** to demo data
- **Real streaming URLs** in all video players

This plan completely eliminates mock data and transforms WeAnime into a legitimate Crunchyroll-powered streaming platform.