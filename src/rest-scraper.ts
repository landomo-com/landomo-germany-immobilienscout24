/**
 * ImmobilienScout24 REST API Scraper
 *
 * High-performance scraper using the official REST API.
 * Supports complex filtering, pagination, and German-specific property fields.
 *
 * Performance target: 5000 listings in < 5 minutes
 */

import { Property, ScraperResult } from '@shared/types';
import {
  IS24RestApiClient,
  IS24ApiSearchParams,
  buildPriceRange,
  buildSpaceRange,
  buildRoomsRange
} from './api-client';
import { createLogger } from '@shared/logger';

const logger = createLogger('IS24RestScraper');

/**
 * German property type constants
 */
export enum GermanPropertyType {
  WOHNUNG = 'ApartmentBuy',           // Apartment for sale
  WOHNUNG_MIETE = 'ApartmentRent',    // Apartment for rent
  HAUS = 'HouseBuy',                   // House for sale
  HAUS_MIETE = 'HouseRent'             // House for rent
}

/**
 * German heating types (Heizungsart)
 */
export const GERMAN_HEATING_TYPES: Record<string, string> = {
  'Zentralheizung': 'Central heating',
  'Etagenheizung': 'Apartment heating',
  'Einzelofen': 'Single stove',
  'Fußbodenheizung': 'Floor heating',
  'Gasheizung': 'Gas heating',
  'Ölheizung': 'Oil heating',
  'Wärmepumpe': 'Heat pump',
  'Fernwärme': 'District heating'
};

/**
 * German property conditions (Zustand)
 */
export const GERMAN_PROPERTY_CONDITIONS: Record<string, string> = {
  'Saniert': 'Renovated',
  'Vollständig renoviert': 'Fully renovated',
  'Gepflegt': 'Maintained',
  'Baumängel': 'Structural defects',
  'Modernisiert': 'Modernized',
  'Neu': 'New',
  'Rohbau': 'Raw structure',
  'Denkmalschutz': 'Listed building'
};

/**
 * German districts/regions mapping for major cities
 */
export const GERMAN_DISTRICTS: Record<string, Record<string, string>> = {
  'Berlin': {
    'Mitte': 'Central',
    'Friedrichshain-Kreuzberg': 'East Central',
    'Pankow': 'North',
    'Charlottenburg-Wilmersdorf': 'West',
    'Spandau': 'Northwest',
    'Steglitz-Zehlendorf': 'Southwest',
    'Tempelhof-Schöneberg': 'South',
    'Neukölln': 'Southeast',
    'Treptow-Köpenick': 'East',
    'Lichtenberg': 'East',
    'Marzahn-Hellersdorf': 'Northeast',
    'Reinickendorf': 'North'
  }
};

/**
 * Scraper configuration
 */
export interface RestScraperOptions {
  transactionTypes?: ('sale' | 'rent')[];
  propertyTypes?: ('apartment' | 'house')[];
  cities?: string[];
  geocodes?: string[];
  priceMin?: number;
  priceMax?: number;
  sqmMin?: number;
  sqmMax?: number;
  roomsMin?: number;
  roomsMax?: number;
  maxPages?: number;
  pageSize?: number;
  rateLimit?: number;
  verbose?: boolean;
  features?: {
    balcony?: boolean;
    garden?: boolean;
    builtInKitchen?: boolean;
    parkingSpace?: boolean;
    lift?: boolean;
    cellar?: boolean;
    newBuilding?: boolean;
  };
}

/**
 * Rest Scraper for ImmobilienScout24
 */
export class IS24RestScraper {
  private client: IS24RestApiClient;
  private options: Required<RestScraperOptions>;
  private logger = createLogger('IS24RestScraper');

  private readonly defaultGeocodes: Record<string, string> = {
    'Berlin': '1276003001046',
    'Munich': '1276009162046',
    'Hamburg': '1276002000046',
    'Frankfurt': '1276006412046',
    'Cologne': '1276005315046',
    'Stuttgart': '1276008403046',
    'Düsseldorf': '1276004164046',
    'Dortmund': '1276000862046',
    'Essen': '1276003640046',
    'Leipzig': '1276007339046'
  };

  constructor(options: RestScraperOptions = {}) {
    this.options = this.mergeOptions(options);
    this.client = IS24RestApiClient.fromEnv();
  }

  /**
   * Merge user options with defaults
   */
  private mergeOptions(options: RestScraperOptions): Required<RestScraperOptions> {
    return {
      transactionTypes: options.transactionTypes || ['sale', 'rent'],
      propertyTypes: options.propertyTypes || ['apartment', 'house'],
      cities: options.cities || [],
      geocodes: options.geocodes || [],
      priceMin: options.priceMin || 0,
      priceMax: options.priceMax || 0,
      sqmMin: options.sqmMin || 0,
      sqmMax: options.sqmMax || 0,
      roomsMin: options.roomsMin || 0,
      roomsMax: options.roomsMax || 0,
      maxPages: options.maxPages || 5,
      pageSize: options.pageSize || 50,
      rateLimit: options.rateLimit || 1000,
      verbose: options.verbose || false,
      features: options.features || {}
    };
  }

  /**
   * Log with verbose control
   */
  private log(message: string): void {
    if (this.options.verbose) {
      this.logger.info(message);
    }
  }

  /**
   * Sleep for rate limiting
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Map transaction type to API type
   */
  private getApiRealEstateType(propertyType: 'apartment' | 'house', transactionType: 'sale' | 'rent'): string {
    const map: Record<string, Record<string, string>> = {
      apartment: { sale: 'ApartmentBuy', rent: 'ApartmentRent' },
      house: { sale: 'HouseBuy', rent: 'HouseRent' }
    };
    return map[propertyType]?.[transactionType] || 'ApartmentBuy';
  }

  /**
   * Scrape with main method
   */
  async scrape(): Promise<ScraperResult> {
    const result: ScraperResult = {
      properties: [],
      totalFound: 0,
      pagesScraped: 0,
      errors: []
    };

    const seenIds = new Set<string>();

    // Determine geocodes to search
    const geocodes = this.getGeocodes();

    if (geocodes.length === 0) {
      result.errors.push('No geocodes specified. Please set cities or provide geocodes.');
      return result;
    }

    // Iterate through combinations
    for (const transactionType of this.options.transactionTypes) {
      for (const propertyType of this.options.propertyTypes) {
        const realEstateType = this.getApiRealEstateType(propertyType, transactionType);

        for (const geocode of geocodes) {
          try {
            const startTime = Date.now();
            this.log(`Scraping ${realEstateType} in geocode ${geocode}...`);

            const searchParams: IS24ApiSearchParams = {
              realestatetype: realEstateType,
              geocodes: geocode,
              pagesize: this.options.pageSize,
              price: buildPriceRange(this.options.priceMin, this.options.priceMax),
              livingspace: buildSpaceRange(this.options.sqmMin, this.options.sqmMax),
              numberofrooms: buildRoomsRange(this.options.roomsMin, this.options.roomsMax),
              ...(this.options.features?.balcony && { balcony: true }),
              ...(this.options.features?.garden && { garden: true }),
              ...(this.options.features?.builtInKitchen && { builtinkitchen: true }),
              ...(this.options.features?.parkingSpace && { parkingspace: true }),
              ...(this.options.features?.lift && { lift: true }),
              ...(this.options.features?.cellar && { cellar: true }),
              ...(this.options.features?.newBuilding && { newbuilding: true })
            };

            let page = 1;
            let hasMore = true;
            let categoryTotal = 0;

            while (hasMore && page <= this.options.maxPages) {
              try {
                searchParams.pagenumber = page;
                this.log(`  Page ${page}...`);

                const searchResult = await this.client.search(searchParams);

                if (page === 1) {
                  categoryTotal = searchResult.totalHits;
                  result.totalFound = Math.max(result.totalFound, categoryTotal);
                }

                // Add properties
                for (const property of searchResult.properties) {
                  if (!seenIds.has(property.id)) {
                    seenIds.add(property.id);
                    result.properties.push(property);
                  }
                }

                result.pagesScraped++;

                hasMore = page < searchResult.numberOfPages && searchResult.properties.length > 0;
                page++;

                if (hasMore) {
                  await this.sleep(this.options.rateLimit);
                }
              } catch (error) {
                const errorMsg = `Error on page ${page}: ${error}`;
                result.errors.push(errorMsg);
                this.logger.error(errorMsg);
                break;
              }
            }

            const duration = Date.now() - startTime;
            this.log(`  Completed in ${duration}ms. Found ${result.properties.length} total properties.`);

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
   * Scrape specific search with max results limit
   */
  async scrapeSearch(
    transactionType: 'sale' | 'rent',
    propertyType: 'apartment' | 'house',
    geocode: string,
    maxResults: number = 1000
  ): Promise<Property[]> {
    const properties: Property[] = [];
    const seenIds = new Set<string>();
    const realEstateType = this.getApiRealEstateType(propertyType, transactionType);
    const maxPages = Math.ceil(maxResults / this.options.pageSize);

    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages && properties.length < maxResults) {
      try {
        const searchResult = await this.client.search({
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

        hasMore = page < searchResult.numberOfPages && searchResult.properties.length > 0;
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

  /**
   * Get geocodes from cities or use provided geocodes
   */
  private getGeocodes(): string[] {
    if (this.options.geocodes.length > 0) {
      return this.options.geocodes;
    }

    const geocodes: string[] = [];
    for (const city of this.options.cities) {
      const geocode = this.defaultGeocodes[city];
      if (geocode) {
        geocodes.push(geocode);
        this.log(`City ${city} -> geocode ${geocode}`);
      } else {
        this.logger.warn(`Unknown city: ${city}`);
      }
    }

    return geocodes;
  }

  /**
   * Get available cities
   */
  getAvailableCities(): string[] {
    return Object.keys(this.defaultGeocodes);
  }

  /**
   * Translate German property field
   */
  static translateGermanField(field: string, value?: string): string {
    if (!value) return '';

    if (GERMAN_HEATING_TYPES[value]) {
      return GERMAN_HEATING_TYPES[value];
    }

    if (GERMAN_PROPERTY_CONDITIONS[value]) {
      return GERMAN_PROPERTY_CONDITIONS[value];
    }

    return value;
  }

  /**
   * Normalize German text
   */
  static normalizeGermanText(text: string): string {
    return text
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/Ä/g, 'AE')
      .replace(/Ö/g, 'OE')
      .replace(/Ü/g, 'UE');
  }
}

export default IS24RestScraper;
