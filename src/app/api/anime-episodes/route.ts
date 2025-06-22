import { NextRequest, NextResponse } from 'next/server'

// Working anime APIs

// Required for static export
export const dynamic = 'force-static'
const JIKAN_API = 'https://api.jikan.moe/v4'
const KITSU_API = 'https://kitsu.io/api/edge'

interface AnimeEpisode {
  id: string
  number: number
  title: string
  description?: string
  image?: string
  aired?: string
  score?: number
  filler?: boolean
}

async function fetchFromJikan(animeId: string): Promise<AnimeEpisode[]> {
  try {
    console.log(`Fetching episodes from Jikan for anime: ${animeId}`)

    // Fetch all episodes (Jikan paginates, so we need to get all pages)
    let allEpisodes: AnimeEpisode[] = []
    let page = 1
    let hasNextPage = true

    while (hasNextPage && page <= 10) { // Limit to 10 pages to avoid infinite loops
      const response = await fetch(`${JIKAN_API}/anime/${animeId}/episodes?page=${page}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(15000)
      })

      if (!response.ok) {
        throw new Error(`Jikan API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.data && Array.isArray(data.data)) {
        const episodes = data.data.map((ep: any) => ({
          id: `jikan-${animeId}-ep-${ep.mal_id}`,
          number: ep.mal_id,
          title: ep.title || `Episode ${ep.mal_id}`,
          description: ep.title_japanese || ep.title_romanji,
          aired: ep.aired,
          score: ep.score,
          filler: ep.filler || false
        }))

        allEpisodes.push(...episodes)

        // Check if there's a next page
        hasNextPage = data.pagination?.has_next_page || false
        page++
      } else {
        hasNextPage = false
      }
    }

    return allEpisodes
  } catch (error) {
    console.error('Jikan API error:', error)
    throw error
  }
}

async function fetchFromKitsu(animeId: string): Promise<AnimeEpisode[]> {
  try {
    console.log(`Fetching episodes from Kitsu for anime: ${animeId}`)

    // First get the Kitsu ID mapping from MAL ID
    const mappingResponse = await fetch(`${KITSU_API}/mappings?filter[external_site]=myanimelist/anime&filter[external_id]=${animeId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!mappingResponse.ok) {
      throw new Error(`Kitsu mapping API error: ${mappingResponse.status}`)
    }

    const mappingData = await mappingResponse.json()

    if (!mappingData.data || mappingData.data.length === 0) {
      throw new Error(`No Kitsu mapping found for MAL ID: ${animeId}`)
    }

    const kitsuId = mappingData.data[0].relationships.item.data.id

    // Now fetch episodes from Kitsu
    const episodesResponse = await fetch(`${KITSU_API}/anime/${kitsuId}/episodes`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!episodesResponse.ok) {
      throw new Error(`Kitsu episodes API error: ${episodesResponse.status}`)
    }

    const episodesData = await episodesResponse.json()

    if (episodesData.data && Array.isArray(episodesData.data)) {
      return episodesData.data.map((ep: any) => ({
        id: `kitsu-${kitsuId}-ep-${ep.id}`,
        number: ep.attributes.number || 1,
        title: ep.attributes.canonicalTitle || `Episode ${ep.attributes.number}`,
        description: ep.attributes.synopsis,
        image: ep.attributes.thumbnail?.original,
        aired: ep.attributes.airdate
      }))
    }

    // Return empty array with proper logging when no episodes found
    console.log(`No episodes found for anime ID: ${animeId}`)
    return []
  } catch (error) {
    console.error('Kitsu API error:', error)
    throw error
  }
}

// Comprehensive list of popular anime IDs supported by Jikan API
const SUPPORTED_ANIME_IDS = [
  // Classic Long-Running Series
  '20',    // Naruto
  '21',    // One Piece
  '1735',  // Naruto Shippuden
  '269',   // Bleach
  '813',   // Dragon Ball Z
  '223',   // Dragon Ball
  '6033',  // Dragon Ball Z Kai

  // Modern Popular Series
  '16498', // Attack on Titan
  '38000', // Demon Slayer
  '40748', // Jujutsu Kaisen
  '44511', // Chainsaw Man
  '48583', // Attack on Titan Final Season
  '49387', // Vinland Saga Season 2
  '50172', // Mob Psycho 100 III

  // Highly Rated Classics
  '5114',  // Fullmetal Alchemist: Brotherhood
  '11061', // Hunter x Hunter (2011)
  '1535',  // Death Note
  '2904',  // Code Geass
  '9253',  // Steins;Gate
  '1',     // Cowboy Bebop
  '6',     // Trigun
  '235',   // Detective Conan

  // Popular Shounen
  '30276', // One Punch Man
  '31964', // Boku no Hero Academia
  '97940', // Black Clover
  '14719', // JoJo's Bizarre Adventure
  '20605', // Tokyo Ghoul
  '22319', // Tokyo Ghoul √A
  '35120', // JoJo Part 4
  '48569', // JoJo Part 6

  // Popular Seinen/Josei
  '32281', // Kimi no Na wa (Your Name)
  '28977', // Gintama°
  '9969',  // Gintama'
  '15417', // Gintama': Enchousen
  '918',   // Gintama
  '4181',  // Clannad: After Story
  '2167',  // Clannad

  // Recent Popular
  '154587', // Frieren
  '52991',  // Spy x Family
  '50709',  // Spy x Family Part 2
  '48316',  // 86 Eighty-Six
  '51009',  // Jujutsu Kaisen 0
  '47778',  // Komi Can't Communicate
  '48895',  // Komi Can't Communicate Season 2

  // Studio Ghibli & Movies
  '164',   // Spirited Away
  '523',   // Howl's Moving Castle
  '572',   // Totoro
  '430',   // Princess Mononoke
  '513',   // Kiki's Delivery Service
  '578',   // Castle in the Sky

  // Sports & Slice of Life
  '20583', // Haikyuu!!
  '28891', // Haikyuu!! Second Season
  '32935', // Haikyuu!! Third Season
  '41025', // Haikyuu!! Fourth Season
  '10087', // Fate/Zero
  '22297', // Fate/Zero 2nd Season
  '356',   // Fate/stay night

  // Isekai & Fantasy
  '39535', // Mushoku Tensei
  '45576', // Mushoku Tensei Part 2
  '40591', // Re:Zero Season 2
  '31240', // Re:Zero
  '25777', // No Game No Life
  '33352', // Overlord
  '35073', // Overlord II
  '37675', // Overlord III

  // Current anime being viewed
  '180367', // Current Anime Series
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const animeId = searchParams.get('animeId')

    if (!animeId) {
      return NextResponse.json(
        {
          error: 'Missing animeId parameter',
          success: false
        },
        { status: 400 }
      )
    }

    console.log(`Fetching episodes for anime ID: ${animeId}`)

    // Check if this anime is supported
    if (!SUPPORTED_ANIME_IDS.includes(animeId)) {
      return NextResponse.json(
        {
          error: `Anime ID ${animeId} not supported yet`,
          success: false,
          supportedAnime: SUPPORTED_ANIME_IDS,
          message: 'We are working on adding more anime. Currently supported anime have real episode data from Jikan API.'
        },
        { status: 404 }
      )
    }

    let episodes: AnimeEpisode[] = []
    let source = ''

    // Try Jikan first (most reliable)
    try {
      episodes = await fetchFromJikan(animeId)
      source = 'jikan'
      console.log(`Successfully fetched ${episodes.length} episodes from Jikan`)
    } catch (error) {
      console.warn('Jikan failed, trying Kitsu...')

      // Fallback to Kitsu
      try {
        episodes = await fetchFromKitsu(animeId)
        source = 'kitsu'
        console.log(`Successfully fetched ${episodes.length} episodes from Kitsu`)
      } catch (kitsuError) {
        console.warn('Kitsu also failed')
      }
    }

    if (episodes.length === 0) {
      // Try episode service instead of fallback data
      console.log(`Trying episode service for anime ${animeId}`)
      try {
        const { getAnimeEpisodes } = await import('@/lib/episode-service')
        const realEpisodes = await getAnimeEpisodes(parseInt(animeId))

        if (realEpisodes && realEpisodes.length > 0) {
          console.log(`Found ${realEpisodes.length} episodes for anime ${animeId}`)
          return NextResponse.json({
            success: true,
            animeId,
            episodes: realEpisodes.map((ep: any) => ({
              id: ep.id,
              number: ep.number,
              title: ep.title,
              description: ep.description,
              aired: ep.airDate,
              score: 0,
              filler: false
            })),
            count: realEpisodes.length,
            source: 'crunchyroll_real',
            message: 'Real Crunchyroll episodes loaded',
            timestamp: new Date().toISOString()
          })
        }
      } catch (realEpisodeError) {
        console.warn('Episode service also failed:', realEpisodeError)
      }

      return NextResponse.json(
        {
          error: 'No episodes found from any source',
          success: false,
          animeId,
          triedSources: ['jikan', 'kitsu', 'fallback'],
          message: 'Episode data temporarily unavailable. APIs may be down and no fallback data available.'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      animeId,
      episodes,
      count: episodes.length,
      source,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Episodes API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch episodes',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    )
  }
}
