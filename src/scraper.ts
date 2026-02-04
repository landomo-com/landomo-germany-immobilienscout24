import axios, { AxiosInstance, AxiosError } from 'axios';
import { Property, ScraperConfig, ScraperResult } from '@shared/types';
import { createLogger } from '@shared/logger';
import {
  MobileSearchResponse,
  MobileExposeResponse,
  parseSearchResponse,
  parseExposeResponse
} from './parser';

/**
 * Search parameters for ImmobilienScout24 mobile API
 */
export interface IS24SearchParams {
  searchType?: 'region' | 'radius' | 'shape';
  realestatetype?: string;  // apartmentrent, apartmentbuy, houserent, housebuy
  geocodes?: string;        // Geocode ID for region
  pagenumber?: number;
  pagesize?: number;
  price?: string;           // min-max (e.g., "100000-500000" or "-500000" or "100000-")
  livingspace?: string;     // min-max sqm
  numberofrooms?: string;   // min-max rooms
  sorting?: string;         // price, datepublished, etc.
}

/**
 * Scraper options
 */
export interface IS24ScraperOptions {
  transactionTypes?: ('sale' | 'rent')[];
  propertyTypes?: ('apartment' | 'house')[];
  geocodes?: string[];      // Geocode IDs for regions
  priceMin?: number;
  priceMax?: number;
  livingSpaceMin?: number;
  livingSpaceMax?: number;
  roomsMin?: number;
  roomsMax?: number;
  maxPages?: number;
  pageSize?: number;
  rateLimit?: number;       // ms between requests
  verbose?: boolean;
}

const DEFAULT_OPTIONS: Required<IS24ScraperOptions> = {
  transactionTypes: ['sale', 'rent'],
  propertyTypes: ['apartment', 'house'],
  geocodes: [],
  priceMin: 0,
  priceMax: 0,
  livingSpaceMin: 0,
  livingSpaceMax: 0,
  roomsMin: 0,
  roomsMax: 0,
  maxPages: 5,
  pageSize: 20,
  rateLimit: 1000,
  verbose: false
};

/**
 * Geocodes for German regions
 * Note: The mobile API has strict geocode validation. Only Berlin (1276003001)
 * has been verified to work. Other cities may require different geocode formats
 * or may need to be discovered through the ImmobilienScout24 website.
 *
 * To find geocodes:
 * 1. Visit immobilienscout24.de and search for a city
 * 2. Look at the URL for geocode patterns
 * 3. Test with the mobile API
 */
export const GEOCODES: Record<string, string> = {
  // Verified working
  BERLIN: '1276003001',

  // Note: These geocodes may not work with the mobile API
  // They are included for reference and may need to be updated
  // MUNICH: '1276009162',      // Not verified
  // HAMBURG: '1276002000',     // Not verified
  // FRANKFURT: '1276006412',   // Not verified
  // COLOGNE: '1276005315',     // Not verified
};

export class ImmobilienScout24Scraper {
  private logger = createLogger(this.constructor.name);
  private client: AxiosInstance;
  private options: Required<IS24ScraperOptions>;

  private readonly baseUrl = 'https://api.mobile.immobilienscout24.de';
  private readonly userAgent = 'ImmoScout_27.12_26.2_._';

  constructor(options: IS24ScraperOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      }
    });
  }

  private log(message: string): void {
    if (this.options.verbose) {
      this.logger.info(`[IS24Scraper] ${message}`);
    }
  }

  /**
   * Sleep for rate limiting
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build real estate type for API
   */
  private buildRealEstateType(propertyType: 'apartment' | 'house', transactionType: 'sale' | 'rent'): string {
    const propMap: Record<string, Record<string, string>> = {
      apartment: { sale: 'apartmentbuy', rent: 'apartmentrent' },
      house: { sale: 'housebuy', rent: 'houserent' }
    };
    return propMap[propertyType]?.[transactionType] || 'apartmentbuy';
  }

  /**
   * Build price range string
   */
  private buildRangeString(min?: number, max?: number): string | undefined {
    if (!min && !max) return undefined;
    if (min && max) return `${min}-${max}`;
    if (min) return `${min}-`;
    if (max) return `-${max}`;
    return undefined;
  }

  /**
   * Get total count for a search
   */
  async getTotalCount(params: IS24SearchParams): Promise<number> {
    try {
      const queryParams = new URLSearchParams();
      if (params.searchType) queryParams.append('searchType', params.searchType);
      if (params.realestatetype) queryParams.append('realestatetype', params.realestatetype);
      if (params.geocodes) queryParams.append('geocodes', params.geocodes);
      if (params.price) queryParams.append('price', params.price);
      if (params.livingspace) queryParams.append('livingspace', params.livingspace);
      if (params.numberofrooms) queryParams.append('numberofrooms', params.numberofrooms);

      const url = `/search/total?${queryParams.toString()}`;
      this.log(`Getting total count: ${url}`);

      const response = await this.client.get(url);
      const total = response.data?.searchResponseModel?.resultlist?.paging?.numberOfHits ||
                    response.data?.resultlist?.paging?.numberOfHits ||
                    response.data?.numberOfHits ||
                    0;

      this.log(`Total count: ${total}`);
      return total;
    } catch (error) {
      this.log(`Error getting total count: ${error}`);
      return 0;
    }
  }

  /**
   * Search for listings
   */
  async search(params: IS24SearchParams): Promise<{
    properties: Property[];
    totalHits: number;
    currentPage: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();

    if (params.searchType) queryParams.append('searchType', params.searchType);
    if (params.realestatetype) queryParams.append('realestatetype', params.realestatetype);
    if (params.geocodes) queryParams.append('geocodes', params.geocodes);
    if (params.pagenumber) queryParams.append('pagenumber', params.pagenumber.toString());
    if (params.pagesize) queryParams.append('pagesize', params.pagesize.toString());
    if (params.price) queryParams.append('price', params.price);
    if (params.livingspace) queryParams.append('livingspace', params.livingspace);
    if (params.numberofrooms) queryParams.append('numberofrooms', params.numberofrooms);
    if (params.sorting) queryParams.append('sorting', params.sorting);

    const url = `/search/list?${queryParams.toString()}`;
    this.log(`Searching: ${url}`);

    try {
      const response = await this.client.post<MobileSearchResponse>(
        url,
        {
          supportedResultListTypes: [],
          userData: {}
        }
      );

      return parseSearchResponse(response.data);
    } catch (error) {
      const axiosError = error as AxiosError;
      this.log(`Search error: ${axiosError.message}`);

      if (axiosError.response) {
        this.log(`Response status: ${axiosError.response.status}`);
        this.log(`Response data: ${JSON.stringify(axiosError.response.data)}`);
      }

      throw error;
    }
  }

  /**
   * Get expose (detail) for a specific listing
   */
  async getExpose(exposeId: string): Promise<Property | null> {
    const url = `/expose/${exposeId}`;
    this.log(`Getting expose: ${url}`);

    try {
      const response = await this.client.get<MobileExposeResponse>(url);
      return parseExposeResponse(response.data, exposeId);
    } catch (error) {
      const axiosError = error as AxiosError;
      this.log(`Expose error: ${axiosError.message}`);
      return null;
    }
  }

  /**
   * Main scrape method
   */
  async scrape(): Promise<ScraperResult> {
    const result: ScraperResult = {
      properties: [],
      totalFound: 0,
      pagesScraped: 0,
      errors: []
    };

    const seenIds = new Set<string>();

    for (const transactionType of this.options.transactionTypes) {
      for (const propertyType of this.options.propertyTypes) {
        const realEstateType = this.buildRealEstateType(propertyType, transactionType);

        // If geocodes specified, search each; otherwise search without geocode
        const geocodes = this.options.geocodes.length > 0 ? this.options.geocodes : [undefined];

        for (const geocode of geocodes) {
          try {
            const baseParams: IS24SearchParams = {
              searchType: geocode ? 'region' : undefined,
              realestatetype: realEstateType,
              geocodes: geocode,
              pagesize: this.options.pageSize,
              price: this.buildRangeString(this.options.priceMin, this.options.priceMax),
              livingspace: this.buildRangeString(this.options.livingSpaceMin, this.options.livingSpaceMax),
              numberofrooms: this.buildRangeString(this.options.roomsMin, this.options.roomsMax)
            };

            // Get first page
            let page = 1;
            let hasMore = true;

            while (hasMore && page <= this.options.maxPages) {
              try {
                const searchResult = await this.search({
                  ...baseParams,
                  pagenumber: page
                });

                for (const property of searchResult.properties) {
                  if (!seenIds.has(property.id)) {
                    seenIds.add(property.id);
                    result.properties.push(property);
                  }
                }

                result.totalFound = Math.max(result.totalFound, searchResult.totalHits);
                result.pagesScraped++;

                hasMore = page < searchResult.totalPages && searchResult.properties.length > 0;
                page++;

                if (hasMore) {
                  await this.sleep(this.options.rateLimit);
                }
              } catch (error) {
                const errorMsg = `Error on page ${page} for ${realEstateType}${geocode ? `/${geocode}` : ''}: ${error}`;
                result.errors.push(errorMsg);
                this.logger.error(errorMsg);
                break;
              }
            }
          } catch (error) {
            const errorMsg = `Error searching ${realEstateType}: ${error}`;
            result.errors.push(errorMsg);
            this.logger.error(errorMsg);
          }

          await this.sleep(this.options.rateLimit);
        }
      }
    }

    return result;
  }

  /**
   * Scrape with specific parameters (convenience method)
   */
  async scrapeSearch(
    transactionType: 'sale' | 'rent',
    propertyType: 'apartment' | 'house',
    geocode?: string,
    maxResults: number = 100
  ): Promise<Property[]> {
    const properties: Property[] = [];
    const seenIds = new Set<string>();

    const realEstateType = this.buildRealEstateType(propertyType, transactionType);
    const maxPages = Math.ceil(maxResults / this.options.pageSize);

    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages && properties.length < maxResults) {
      try {
        const searchResult = await this.search({
          searchType: geocode ? 'region' : undefined,
          realestatetype: realEstateType,
          geocodes: geocode,
          pagenumber: page,
          pagesize: this.options.pageSize
        });

        for (const property of searchResult.properties) {
          if (!seenIds.has(property.id) && properties.length < maxResults) {
            seenIds.add(property.id);
            properties.push(property);
          }
        }

        hasMore = page < searchResult.totalPages && searchResult.properties.length > 0;
        page++;

        if (hasMore) {
          await this.sleep(this.options.rateLimit);
        }
      } catch (error) {
        this.log(`Error on page ${page}: ${error}`);
        break;
      }
    }

    return properties;
  }
}

/**
 * Get scraper configuration
 */
export function getConfig(): ScraperConfig {
  return {
    portal: 'immobilienscout24',
    baseUrl: 'https://api.mobile.immobilienscout24.de',
    transactionTypes: ['sale', 'rent'],
    rateLimit: 1000,
    maxRetries: 3
  };
}
