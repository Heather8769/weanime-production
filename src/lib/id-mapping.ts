/**
 * ID Mapping Service
 * Maps AniList IDs to Crunchyroll IDs for real integration
 */

// AniList ID to Crunchyroll ID mapping
// This maps the anime IDs from AniList (used in frontend) to real Crunchyroll IDs
export const ANILIST_TO_CRUNCHYROLL_MAPPING: Record<number, string> = {
  // Attack on Titan series
  16498: 'GR751KNZY', // Attack on Titan (AniList) -> Attack on Titan (Crunchyroll)
  
  // One Piece
  21: 'GRMG8ZQZR', // One Piece (AniList) -> One Piece (Crunchyroll)
  
  // Naruto series
  20: 'GY9PJ5KWR', // Naruto (AniList) -> Naruto (Crunchyroll)
  1735: 'GYQ4MW246', // Naruto Shippuden (AniList) -> Naruto Shippuden (Crunchyroll)
  
  // Popular anime that we know work with Crunchyroll
  11757: 'GR49G9VP6', // Sword Art Online
  22319: 'G6NQ5DWZ6', // Tokyo Ghoul
  30276: 'G63VGG2NY', // One Punch Man
  38000: 'GY5P48XEY', // Demon Slayer
  40748: 'GRDV0019R', // Jujutsu Kaisen
  
  // Add more mappings as we discover them
}

// Reverse mapping for Crunchyroll ID to AniList ID
export const CRUNCHYROLL_TO_ANILIST_MAPPING: Record<string, number> = Object.fromEntries(
  Object.entries(ANILIST_TO_CRUNCHYROLL_MAPPING).map(([anilistId, crunchyrollId]) => [crunchyrollId, parseInt(anilistId)])
)

/**
 * Convert AniList ID to Crunchyroll ID
 */
export function anilistToCrunchyrollId(anilistId: number): string | null {
  return ANILIST_TO_CRUNCHYROLL_MAPPING[anilistId] || null
}

/**
 * Convert Crunchyroll ID to AniList ID
 */
export function crunchyrollToAnilistId(crunchyrollId: string): number | null {
  return CRUNCHYROLL_TO_ANILIST_MAPPING[crunchyrollId] || null
}

/**
 * Check if an anime has Crunchyroll integration available
 */
export function hasRealCrunchyrollIntegration(anilistId: number): boolean {
  return anilistId in ANILIST_TO_CRUNCHYROLL_MAPPING
}

/**
 * Get all supported anime IDs
 */
export function getSupportedAnimeIds(): number[] {
  return Object.keys(ANILIST_TO_CRUNCHYROLL_MAPPING).map(id => parseInt(id))
}

/**
 * Get all supported Crunchyroll IDs
 */
export function getSupportedCrunchyrollIds(): string[] {
  return Object.values(ANILIST_TO_CRUNCHYROLL_MAPPING)
}

/**
 * Search for anime by title and return the best match
 * This can be used when we don't have a direct ID mapping
 */
export function findAnimeByTitle(title: string): { anilistId: number; crunchyrollId: string } | null {
  const titleLower = title.toLowerCase()
  
  // Simple title matching - can be enhanced later
  const titleMappings: Record<string, { anilistId: number; crunchyrollId: string }> = {
    'attack on titan': { anilistId: 16498, crunchyrollId: 'GR751KNZY' },
    'shingeki no kyojin': { anilistId: 16498, crunchyrollId: 'GR751KNZY' },
    'one piece': { anilistId: 21, crunchyrollId: 'GRMG8ZQZR' },
    'naruto': { anilistId: 20, crunchyrollId: 'GY9PJ5KWR' },
    'sword art online': { anilistId: 11757, crunchyrollId: 'GR49G9VP6' },
    'tokyo ghoul': { anilistId: 22319, crunchyrollId: 'G6NQ5DWZ6' },
    'one punch man': { anilistId: 30276, crunchyrollId: 'G63VGG2NY' },
    'demon slayer': { anilistId: 38000, crunchyrollId: 'GY5P48XEY' },
    'kimetsu no yaiba': { anilistId: 38000, crunchyrollId: 'GY5P48XEY' },
    'jujutsu kaisen': { anilistId: 40748, crunchyrollId: 'GRDV0019R' },
  }
  
  return titleMappings[titleLower] || null
}

/**
 * Debug function to log mapping information
 */
export function debugMapping(anilistId: number): void {
  const crunchyrollId = anilistToCrunchyrollId(anilistId)
  console.log(`[ID Mapping] AniList ${anilistId} -> Crunchyroll ${crunchyrollId || 'NOT_MAPPED'}`)
  console.log(`[ID Mapping] Real Crunchyroll integration: ${hasRealCrunchyrollIntegration(anilistId) ? 'YES' : 'NO'}`)
}
