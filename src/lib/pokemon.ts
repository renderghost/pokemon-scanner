import { z } from 'zod';

/**
 * Base URL for the PokeAPI.
 */
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

/**
 * API status states.
 */
export type PokemonApiStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Pokemon data schema validation.
 */
const PokemonSchema = z.object({
  id: z.number(),
  name: z.string(),
  sprites: z.object({
    front_default: z.string().nullable(),
    other: z.object({
      'official-artwork': z.object({
        front_default: z.string().nullable(),
      }),
    }).optional(),
  }),
  types: z.array(
    z.object({
      slot: z.number(),
      type: z.object({
        name: z.string(),
        url: z.string(),
      }),
    })
  ),
  species: z.object({
    name: z.string(),
    url: z.string(),
  }),
});

/**
 * List of Pokemon names schema validation.
 */
const PokemonListSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
    })
  ),
});

/**
 * Pokemon data structure.
 *
 * @interface Pokemon
 */
export type Pokemon = z.infer<typeof PokemonSchema>;

/**
 * Pokemon list response structure from the PokeAPI.
 * Used for type validation of the response when fetching the list of all Pokemon names.
 * This ensures we correctly handle the API response structure for better type safety.
 *
 * @interface PokemonList
 */
type PokemonList = z.infer<typeof PokemonListSchema>;

/**
 * Match result from Pokemon identification.
 *
 * @interface PokemonMatch
 */
export interface PokemonMatch {
  /**
   * Matched Pokemon data.
   *
   * @type {Pokemon}
   */
  pokemon: Pokemon;
  
  /**
   * Match confidence score (0-1).
   *
   * @type {number}
   */
  confidence: number;
  
  /**
   * Original text that was matched.
   *
   * @type {string}
   */
  matchedText: string;
  
  /**
   * Processing time in milliseconds.
   *
   * @type {number}
   */
  processingTimeMs: number;
}

/**
 * Cache for Pokemon data to reduce API calls.
 */
interface PokemonCache {
  /**
   * Map of all Pokemon names for quick lookup.
   *
   * @type {Map<string, string>}
   */
  nameMap: Map<string, string>;
  
  /**
   * Map of Pokemon details by name.
   *
   * @type {Map<string, Pokemon>}
   */
  detailsMap: Map<string, Pokemon>;
  
  /**
   * Last time the cache was updated.
   *
   * @type {number}
   */
  lastUpdated: number;
}

/**
 * Singleton class for Pokemon identification functionality.
 */
class PokemonIdentifier {
  private status: PokemonApiStatus = 'idle';
  private cache: PokemonCache = {
    nameMap: new Map(),
    detailsMap: new Map(),
    lastUpdated: 0,
  };
  private cacheExpiryMs = 24 * 60 * 60 * 1000; // 24 hours
  private rateLimitMs = 1000; // 1 second between API calls
  private lastApiCallTime = 0;
  
  /**
   * Gets the current status of the Pokemon identifier.
   *
   * @returns {PokemonApiStatus} Current API status.
   */
  getStatus(): PokemonApiStatus {
    return this.status;
  }
  
  /**
   * Initializes the Pokemon identifier by fetching the list of Pokemon names.
   *
   * @async
   * @param {boolean} [forceRefresh=false] - Whether to force a refresh of the cache.
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails.
   */
  async initialize(forceRefresh = false): Promise<void> {
    // Check if cache is valid
    const now = Date.now();
    if (
      !forceRefresh &&
      this.cache.nameMap.size > 0 &&
      now - this.cache.lastUpdated < this.cacheExpiryMs
    ) {
      this.status = 'ready';
      return;
    }
    
    this.status = 'loading';
    
    try {
      // Fetch the list of all Pokemon
      const response = await fetch(`${POKEAPI_BASE_URL}/pokemon?limit=2000`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      // Parse and validate the API response using the PokemonList schema
      const pokemonList: PokemonList = PokemonListSchema.parse(data);
      
      // Clear existing cache
      this.cache.nameMap.clear();
      
      // Cache all Pokemon names (normalized to lowercase for case-insensitive matching)
      pokemonList.results.forEach((pokemon) => {
        this.cache.nameMap.set(pokemon.name.toLowerCase(), pokemon.name);
      });
      
      this.cache.lastUpdated = now;
      this.status = 'ready';
    } catch (error) {
      this.status = 'error';
      console.error('Failed to initialize Pokemon data:', error);
      throw new Error(`Pokemon API initialization failed: ${error}`);
    }
  }
  
  /**
   * Calculates the Levenshtein distance between two strings.
   *
   * @private
   * @param {string} a - First string.
   * @param {string} b - Second string.
   * @returns {number} The edit distance between the strings.
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    // Initialize the matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill the matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return matrix[b.length][a.length];
  }
  
  /**
   * Calculates similarity between two strings (0-1).
   *
   * @private
   * @param {string} a - First string.
   * @param {string} b - Second string.
   * @returns {number} Similarity score (0-1).
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;
    
    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    
    return 1 - distance / maxLength;
  }
  
  /**
   * Gets detailed information about a specific Pokemon.
   *
   * @async
   * @param {string} name - Pokemon name.
   * @returns {Promise<Pokemon>} Detailed Pokemon data.
   * @throws {Error} If API call fails.
   */
  async getPokemonDetails(name: string): Promise<Pokemon> {
    // Check cache first
    const normalizedName = name.toLowerCase();
    if (this.cache.detailsMap.has(normalizedName)) {
      return this.cache.detailsMap.get(normalizedName)!;
    }
    
    // Apply rate limiting
    const now = Date.now();
    const timeToWait = Math.max(0, this.rateLimitMs - (now - this.lastApiCallTime));
    if (timeToWait > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeToWait));
    }
    
    // Update API call time
    this.lastApiCallTime = Date.now();
    
    try {
      // Fetch Pokemon details
      const response = await fetch(`${POKEAPI_BASE_URL}/pokemon/${normalizedName}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const pokemon = PokemonSchema.parse(data);
      
      // Cache the result
      this.cache.detailsMap.set(normalizedName, pokemon);
      
      return pokemon;
    } catch (error) {
      console.error(`Failed to get details for Pokemon "${name}":`, error);
      throw new Error(`Failed to get Pokemon details: ${error}`);
    }
  }
  
  /**
   * Attempts to identify a Pokemon from extracted OCR text.
   *
   * @async
   * @param {string} text - Text extracted from OCR.
   * @param {string[]} [words] - Individual words extracted from OCR.
   * @param {number} [confidenceThreshold=0.7] - Minimum confidence threshold for match.
   * @returns {Promise<PokemonMatch | null>} The matched Pokemon or null if no match.
   */
  async identifyPokemon(
    text: string,
    words: string[] = [],
    confidenceThreshold = 0.7
  ): Promise<PokemonMatch | null> {
    const startTime = Date.now();
    
    try {
      // Ensure we have Pokemon name data
      if (this.cache.nameMap.size === 0) {
        await this.initialize();
      }
      
      // Combine full text and individual words
      const allTerms = [
        ...words.map((w) => w.toLowerCase()),
        ...text.toLowerCase().split(/\s+/),
      ].filter((term) => term.length > 2); // Filter out very short terms
      
      let bestMatch: { name: string; confidence: number } | null = null;
      
      // Try to find exact matches first (more efficient)
      for (const term of allTerms) {
        if (this.cache.nameMap.has(term)) {
          bestMatch = { name: this.cache.nameMap.get(term)!, confidence: 1.0 };
          break;
        }
      }
      
      // If no exact match, try fuzzy matching
      if (!bestMatch) {
        for (const term of allTerms) {
          for (const [pokemonName, originalName] of this.cache.nameMap.entries()) {
            const similarity = this.calculateSimilarity(term, pokemonName);
            
            if (
              similarity > confidenceThreshold &&
              (!bestMatch || similarity > bestMatch.confidence)
            ) {
              bestMatch = { name: originalName, confidence: similarity };
            }
          }
        }
      }
      
      // If we found a match, get the details
      if (bestMatch) {
        const pokemon = await this.getPokemonDetails(bestMatch.name);
        
        // Log the full API response
        console.log('Pokemon API response:', JSON.stringify(pokemon, null, 2));
        
        return {
          pokemon,
          confidence: bestMatch.confidence,
          matchedText: text,
          processingTimeMs: Date.now() - startTime,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Pokemon identification failed:', error);
      return null;
    }
  }
  
  /**
   * Clears the Pokemon cache.
   */
  clearCache(): void {
    this.cache.nameMap.clear();
    this.cache.detailsMap.clear();
    this.cache.lastUpdated = 0;
  }
}

// Export singleton instance
export const pokemonIdentifier = new PokemonIdentifier();

