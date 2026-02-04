/**
 * ImmobilienScout24 Official REST API Client
 *
 * Uses the official REST API with OAuth 1.0 authentication
 * Base URL: https://rest.immobilienscout24.de/restapi/api/
 *
 * This client provides high-performance access to ImmobilienScout24 listings
 * with support for complex filtering, pagination, and German-specific fields.
 *
 * Authentication Setup:
 * 1. Register at https://api.immobilienscout24.de/
 * 2. Create an application to get OAuth credentials
 * 3. Set environment variables:
 *    - IS24_CONSUMER_KEY
 *    - IS24_CONSUMER_SECRET
 *    - IS24_ACCESS_TOKEN
 *    - IS24_ACCESS_SECRET
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as crypto from 'crypto';
import { Property, ScraperResult } from '@shared/types';
import { createLogger } from '@shared/logger';

const logger = createLogger('IS24ApiClient');

/**
 * OAuth 1.0 Signature Generator for ImmobilienScout24 API
 */
class OAuth1Signer {
  constructor(
    private consumerKey: string,
    private consumerSecret: string,
    private accessToken: string,
    private accessSecret: string
  ) {}

  /**
   * Generate OAuth 1.0 Authorization header
   */
  generateAuthHeader(method: string, url: string, params?: Record<string, string>): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = this.generateNonce();

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_token: this.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0'
    };

    // Combine all parameters (both OAuth and request params)
    const allParams = { ...oauthParams, ...params };

    // Sort parameters
    const sortedParams = Object.keys(allParams)
      .sort()
      .map(key => `${this.percentEncode(key)}=${this.percentEncode(allParams[key])}`)
      .join('&');

    // Create signature base string
    const baseString = [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(sortedParams)
    ].join('&');

    // Create signing key
    const signingKey = `${this.percentEncode(this.consumerSecret)}&${this.percentEncode(this.accessSecret)}`;

    // Generate signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    // Build Authorization header
    const authParams = Object.entries(oauthParams)
      .map(([key, value]) => `${key}="${this.percentEncode(value)}"`)
      .join(',');

    return `OAuth ${authParams},oauth_signature="${this.percentEncode(signature)}"`;
  }

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  private percentEncode(str: string): string {
    return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27')
      .replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A');
  }
}

/**
 * API Response types matching ImmobilienScout24 REST API
 */
export interface ApiSearchResult {
  'resultlist.resultlist'?: {
    paging?: {
      pageNumber: number;
      pageSize: number;
      numberOfPages: number;
      numberOfHits: number;
      numberOfListings: number;
    };
    resultlistEntries?: Array<{
      resultlistEntry?: ApiListingEntry[];
    }>;
  };
}

export interface ApiListingEntry {
  '@id'?: string;
  '@creation'?: string;
  '@modification'?: string;
  realEstate?: ApiRealEstate;
}

export interface ApiRealEstate {
  '@id'?: string;
  '@xsi.type'?: string;
  title?: string;
  description?: string;
  descriptionNote?: string;
  furnishingNote?: string;
  locationNote?: string;
  otherNote?: string;
  address?: {
    street?: string;
    houseNumber?: string;
    postcode?: string;
    city?: string;
    quarter?: string;
    wgs84Coordinate?: {
      latitude?: number;
      longitude?: number;
    };
  };
  price?: {
    value?: number;
    currency?: string;
    marketingType?: string;
  };
  calculatedTotalRent?: {
    totalRent?: {
      value?: number;
    };
  };
  livingSpace?: number;
  numberOfRooms?: number;
  numberOfBedRooms?: number;
  numberOfBathRooms?: number;
  floor?: number;
  numberOfFloors?: number;
  // German-specific features
  balcony?: boolean;
  garden?: boolean;
  terrace?: boolean;
  cellar?: boolean;
  lift?: boolean;
  builtInKitchen?: boolean;
  parkingSpaceType?: string;
  guestToilet?: boolean;
  handicappedAccessible?: boolean;
  petsAllowed?: string;
  energyEfficiencyClass?: string;
  condition?: string;
  heatingType?: string;
  constructionYear?: number;
  freeFrom?: string;
  titlePicture?: {
    '@href'?: string;
  };
  galleryAttachments?: {
    attachment?: Array<{
      '@href'?: string;
    }>;
  };
  contactDetails?: {
    firstname?: string;
    lastname?: string;
    company?: string;
    phoneNumber?: string;
    cellPhoneNumber?: string;
    email?: string;
  };
  realtorCompanyName?: string;
  commercializationType?: string;
}

/**
 * Search parameters for REST API
 */
export interface IS24ApiSearchParams {
  realestatetype: string;  // ApartmentRent, ApartmentBuy, HouseRent, HouseBuy
  geocodes?: string;        // IS24 geocode (e.g., 1276003001046 for Berlin)
  geocoordinates?: string;  // lat;lon;radius for radius search
  price?: string;           // min-max format
  livingspace?: string;     // min-max format
  numberofrooms?: string;   // min-max format
  pagenumber?: number;
  pagesize?: number;
  balcony?: boolean;
  garden?: boolean;
  builtinkitchen?: boolean;
  parkingspace?: boolean;
  lift?: boolean;
  cellar?: boolean;
  newbuilding?: boolean;
  firstactivation?: string; // yyyy-MM-ddTHH:mm:ss
  constructionyear?: string;
  condition?: string;
  heatingtype?: string;
}

/**
 * ImmobilienScout24 REST API Client
 */
export class IS24RestApiClient {
  private client: AxiosInstance;
  private signer: OAuth1Signer | null = null;
  private readonly baseUrl = 'https://rest.immobilienscout24.de/restapi/api';

  constructor(
    private consumerKey?: string,
    private consumerSecret?: string,
    private accessToken?: string,
    private accessSecret?: string
  ) {
    // Initialize OAuth signer if credentials provided
    if (consumerKey && consumerSecret && accessToken && accessSecret) {
      this.signer = new OAuth1Signer(consumerKey, consumerSecret, accessToken, accessSecret);
    }

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'ImmobilienScout24APIClient/1.0',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor for OAuth headers
    this.client.interceptors.request.use(config => {
      if (this.signer && config.url) {
        const fullUrl = this.baseUrl + config.url;
        const params = config.params || {};

        // Remove empty params
        Object.keys(params).forEach(key => {
          if (params[key] === undefined || params[key] === null) {
            delete params[key];
          }
        });

        config.params = params;
        config.headers['Authorization'] = this.signer.generateAuthHeader(
          config.method?.toUpperCase() || 'GET',
          fullUrl,
          params
        );
      }
      return config;
    });
  }

  /**
   * Create a client with credentials from environment variables
   */
  static fromEnv(): IS24RestApiClient {
    const consumerKey = process.env.IS24_CONSUMER_KEY;
    const consumerSecret = process.env.IS24_CONSUMER_SECRET;
    const accessToken = process.env.IS24_ACCESS_TOKEN;
    const accessSecret = process.env.IS24_ACCESS_SECRET;

    if (!consumerKey || !consumerSecret || !accessToken || !accessSecret) {
      logger.warn('IS24 OAuth credentials not found in environment. API requests may fail.');
      logger.info('Set environment variables: IS24_CONSUMER_KEY, IS24_CONSUMER_SECRET, IS24_ACCESS_TOKEN, IS24_ACCESS_SECRET');
    }

    return new IS24RestApiClient(consumerKey, consumerSecret, accessToken, accessSecret);
  }

  /**
   * Search for properties
   */
  async search(params: IS24ApiSearchParams): Promise<{
    properties: Property[];
    totalHits: number;
    pageNumber: number;
    pageSize: number;
    numberOfPages: number;
  }> {
    try {
      // Validate required parameters
      if (!params.realestatetype) {
        throw new Error('realestatetype is required');
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('realestatetype', params.realestatetype);
      if (params.geocodes) queryParams.append('geocodes', params.geocodes);
      if (params.geocoordinates) queryParams.append('geocoordinates', params.geocoordinates);
      if (params.price) queryParams.append('price', params.price);
      if (params.livingspace) queryParams.append('livingspace', params.livingspace);
      if (params.numberofrooms) queryParams.append('numberofrooms', params.numberofrooms);
      if (params.pagenumber) queryParams.append('pagenumber', params.pagenumber.toString());
      if (params.pagesize) queryParams.append('pagesize', params.pagesize.toString());
      if (params.balcony) queryParams.append('balcony', 'true');
      if (params.garden) queryParams.append('garden', 'true');
      if (params.builtinkitchen) queryParams.append('builtinkitchen', 'true');
      if (params.parkingspace) queryParams.append('parkingspace', 'true');
      if (params.lift) queryParams.append('lift', 'true');
      if (params.cellar) queryParams.append('cellar', 'true');
      if (params.newbuilding) queryParams.append('newbuilding', 'true');
      if (params.firstactivation) queryParams.append('firstactivation', params.firstactivation);
      if (params.constructionyear) queryParams.append('constructionyear', params.constructionyear);
      if (params.condition) queryParams.append('condition', params.condition);
      if (params.heatingtype) queryParams.append('heatingtype', params.heatingtype);

      const endpoint = params.geocoordinates ? '/search/v1.0/search/radius' : '/search/v1.0/search/region';
      const url = `${endpoint}?${queryParams.toString()}`;

      logger.debug(`Searching: ${url}`);

      const response = await this.client.get<ApiSearchResult>(url);
      const data = response.data;

      // Parse response
      const paging = data['resultlist.resultlist']?.paging;
      const entries = data['resultlist.resultlist']?.resultlistEntries || [];

      const properties: Property[] = [];
      for (const entry of entries) {
        const listings = entry.resultlistEntry || [];
        for (const listing of listings) {
          const property = this.parseProperty(listing);
          if (property) {
            properties.push(property);
          }
        }
      }

      return {
        properties,
        totalHits: paging?.numberOfHits || 0,
        pageNumber: paging?.pageNumber || 1,
        pageSize: paging?.pageSize || 20,
        numberOfPages: paging?.numberOfPages || 1
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(`Search error: ${axiosError.message}`, { status: axiosError.response?.status });
      throw error;
    }
  }

  /**
   * Get property details by ID
   */
  async getExpose(exposeId: string): Promise<Property | null> {
    try {
      const response = await this.client.get<{ expose?: { realEstate?: ApiRealEstate } }>(
        `/expose/v1.0/exposes/${exposeId}`
      );

      const realEstate = response.data.expose?.realEstate;
      if (!realEstate) {
        return null;
      }

      // Create dummy entry for parsing
      const entry: ApiListingEntry = {
        '@id': exposeId,
        realEstate
      };

      return this.parseProperty(entry);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        return null;
      }
      logger.error(`Get expose error: ${axiosError.message}`);
      return null;
    }
  }

  /**
   * Parse API response to Property object
   */
  private parseProperty(entry: ApiListingEntry): Property | null {
    try {
      const id = entry['@id'] || '';
      const realEstate = entry.realEstate;

      if (!realEstate || !id) {
        return null;
      }

      // Extract basic information
      const title = realEstate.title || 'Property';
      const description = realEstate.description || '';

      // Extract price
      let price = 0;
      let currency = 'EUR';
      if (realEstate.price?.value) {
        price = realEstate.price.value;
        currency = realEstate.price.currency || 'EUR';
      } else if (realEstate.calculatedTotalRent?.totalRent?.value) {
        price = realEstate.calculatedTotalRent.totalRent.value;
      }

      // Extract location
      const address = realEstate.address;
      const city = address?.city || 'Unknown';
      const region = address?.quarter || undefined;
      const postcode = address?.postcode || undefined;
      const fullAddress = address?.street ? `${address.street} ${address.houseNumber || ''}`.trim() : undefined;

      // Extract coordinates
      const coordinates = address?.wgs84Coordinate ? {
        lat: address.wgs84Coordinate.latitude || 0,
        lon: address.wgs84Coordinate.longitude || 0
      } : undefined;

      // Extract details
      const sqm = realEstate.livingSpace;
      const rooms = realEstate.numberOfRooms;
      const bedrooms = realEstate.numberOfBedRooms;
      const bathrooms = realEstate.numberOfBathRooms;
      const floor = realEstate.floor;
      const totalFloors = realEstate.numberOfFloors;

      // Determine transaction type
      const marketingType = realEstate.price?.marketingType?.toLowerCase() || '';
      const transactionType: 'sale' | 'rent' = marketingType.includes('rent') || marketingType.includes('miete') ? 'rent' : 'sale';

      // Determine property type
      const propertyType = this.parsePropertyType(realEstate['@xsi.type'] || '');

      // Extract features
      const features: string[] = [];
      if (realEstate.balcony) features.push('balcony');
      if (realEstate.garden) features.push('garden');
      if (realEstate.terrace) features.push('terrace');
      if (realEstate.cellar) features.push('cellar');
      if (realEstate.lift) features.push('elevator');
      if (realEstate.builtInKitchen) features.push('built-in-kitchen');
      if (realEstate.guestToilet) features.push('guest-toilet');
      if (realEstate.handicappedAccessible) features.push('handicapped-accessible');
      if (realEstate.condition) features.push(`condition-${realEstate.condition.toLowerCase()}`);
      if (realEstate.heatingType) features.push(`heating-${realEstate.heatingType.toLowerCase()}`);
      if (realEstate.parkingSpaceType) features.push(`parking-${realEstate.parkingSpaceType.toLowerCase()}`);
      if (realEstate.energyEfficiencyClass) features.push(`energy-class-${realEstate.energyEfficiencyClass}`);

      // Extract images
      const images: string[] = [];
      if (realEstate.titlePicture?.['@href']) {
        images.push(realEstate.titlePicture['@href']);
      }
      if (realEstate.galleryAttachments?.attachment) {
        for (const att of realEstate.galleryAttachments.attachment) {
          if (att['@href']) {
            images.push(att['@href']);
          }
        }
      }

      // Extract agent information
      const contactDetails = realEstate.contactDetails;
      const agentName = contactDetails ? `${contactDetails.firstname || ''} ${contactDetails.lastname || ''}`.trim() : undefined;
      const agentPhone = contactDetails?.phoneNumber || contactDetails?.cellPhoneNumber;
      const agentEmail = contactDetails?.email;
      const agencyName = realEstate.realtorCompanyName || contactDetails?.company;

      // Build property object
      const property: Property = {
        id,
        title,
        price,
        currency,
        propertyType,
        transactionType,
        location: {
          city,
          region,
          postcode,
          address: fullAddress,
          country: 'Germany',
          coordinates
        },
        details: {
          sqm,
          rooms,
          bedrooms,
          bathrooms,
          floor,
          totalFloors,
          constructionYear: realEstate.constructionYear,
          description,
          availableFrom: realEstate.freeFrom
        },
        features,
        images,
        agent: agencyName ? {
          name: agentName,
          phone: agentPhone,
          email: agentEmail,
          agency: agencyName,
          isPrivate: !realEstate.realtorCompanyName
        } : undefined,
        url: `https://www.immobilienscout24.de/expose/${id}`,
        scrapedAt: new Date().toISOString(),
        metadata: {
          marketingType: realEstate.price?.marketingType,
          condition: realEstate.condition,
          heatingType: realEstate.heatingType,
          petsAllowed: realEstate.petsAllowed
        }
      };

      return property;
    } catch (error) {
      logger.warn(`Error parsing property: ${error}`);
      return null;
    }
  }

  /**
   * Parse property type from API type string
   */
  private parsePropertyType(typeString: string): 'apartment' | 'house' | 'land' | 'commercial' | 'property' {
    const type = typeString.toLowerCase();
    if (type.includes('wohnung') || type.includes('apartment')) return 'apartment';
    if (type.includes('haus') || type.includes('house')) return 'house';
    if (type.includes('grundst') || type.includes('land')) return 'land';
    if (type.includes('gewerbe') || type.includes('buero') || type.includes('commercial')) return 'commercial';
    return 'property';
  }
}

/**
 * Helper to build price range string
 */
export function buildPriceRange(min?: number, max?: number): string | undefined {
  if (!min && !max) return undefined;
  if (min && max) return `${min}-${max}`;
  if (min) return `${min}-`;
  if (max) return `-${max}`;
  return undefined;
}

/**
 * Helper to build living space range string
 */
export function buildSpaceRange(min?: number, max?: number): string | undefined {
  return buildPriceRange(min, max);
}

/**
 * Helper to build rooms range string
 */
export function buildRoomsRange(min?: number, max?: number): string | undefined {
  return buildPriceRange(min, max);
}

export default IS24RestApiClient;
