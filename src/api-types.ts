/**
 * Comprehensive TypeScript Type Definitions for ImmobilienScout24 REST API
 *
 * Provides complete type coverage for all API responses, requests, and domain models.
 * Includes German-specific property fields and enums.
 */

/**
 * Real Estate Types (Immobilientypen)
 */
export enum RealEstateType {
  APARTMENT_BUY = 'ApartmentBuy',
  APARTMENT_RENT = 'ApartmentRent',
  HOUSE_BUY = 'HouseBuy',
  HOUSE_RENT = 'HouseRent'
}

/**
 * Property Type Categories
 */
export enum PropertyCategory {
  APARTMENT = 'apartment',
  SINGLE_FAMILY_HOUSE = 'single-family-house',
  TOWNHOUSE = 'townhouse',
  VILLA = 'villa',
  LAND = 'land',
  OFFICE = 'office',
  RETAIL = 'retail',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  RESTAURANT = 'restaurant'
}

/**
 * Transaction Types
 */
export enum TransactionType {
  SALE = 'sale',
  RENT = 'rent'
}

/**
 * German Property Conditions
 */
export enum PropertyCondition {
  NEW = 'new',
  NEW_BUILD = 'new-build',
  RENOVATED = 'renovated',
  FULLY_RENOVATED = 'fully-renovated',
  MODERNIZED = 'modernized',
  MAINTAINED = 'maintained',
  STRUCTURAL_DEFECTS = 'structural-defects',
  DEMOLITION_CANDIDATE = 'demolition-candidate'
}

/**
 * German Heating Types
 */
export enum HeatingType {
  CENTRAL_HEATING = 'central-heating',
  APARTMENT_HEATING = 'apartment-heating',
  FLOOR_HEATING = 'floor-heating',
  GAS_HEATING = 'gas-heating',
  OIL_HEATING = 'oil-heating',
  HEAT_PUMP = 'heat-pump',
  DISTRICT_HEATING = 'district-heating',
  SINGLE_STOVE = 'single-stove',
  NO_HEATING = 'no-heating'
}

/**
 * Energy Efficiency Classes (EU Standard)
 */
export enum EnergyClass {
  A_PLUS = 'A+',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  G = 'G'
}

/**
 * Parking Types
 */
export enum ParkingType {
  NONE = 'none',
  STREET = 'street',
  PARKING_SPACE = 'parking-space',
  GARAGE = 'garage',
  UNDERGROUND_GARAGE = 'underground-garage',
  CARPORT = 'carport'
}

/**
 * German Districts (Bezirke)
 */
export enum BerlinDistrict {
  MITTE = 'mitte',
  FRIEDRICHSHAIN_KREUZBERG = 'friedrichshain-kreuzberg',
  PANKOW = 'pankow',
  CHARLOTTENBURG_WILMERSDORF = 'charlottenburg-wilmersdorf',
  SPANDAU = 'spandau',
  STEGLITZ_ZEHLENDORF = 'steglitz-zehlendorf',
  TEMPELHOF_SCHOENEBERG = 'tempelhof-schoeneberg',
  NEUKOELLN = 'neukoelln',
  TREPTOW_KOEPENICK = 'treptow-koepenick',
  LICHTENBERG = 'lichtenberg',
  MARZAHN_HELLERSDORF = 'marzahn-hellersdorf',
  REINICKENDORF = 'reinickendorf'
}

/**
 * Search Request Parameters
 */
export interface SearchRequest {
  realestatetype: RealEstateType;
  geocodes?: string;
  geocoordinates?: string;
  price?: string;
  livingspace?: string;
  numberofrooms?: string;
  pagenumber?: number;
  pagesize?: number;
  balcony?: boolean;
  garden?: boolean;
  builtinkitchen?: boolean;
  parkingspace?: boolean;
  lift?: boolean;
  cellar?: boolean;
  newbuilding?: boolean;
  firstactivation?: string;
  constructionyear?: string;
  condition?: string;
  heatingtype?: string;
}

/**
 * Pagination Information
 */
export interface Paging {
  pageNumber: number;
  pageSize: number;
  numberOfPages: number;
  numberOfHits: number;
  numberOfListings: number;
}

/**
 * API Search Response
 */
export interface SearchResponse {
  'resultlist.resultlist'?: {
    paging?: Paging;
    resultlistEntries?: ResultListEntry[];
  };
}

/**
 * Result List Entry
 */
export interface ResultListEntry {
  resultlistEntry?: ListingEntry[];
}

/**
 * Listing Entry
 */
export interface ListingEntry {
  '@id'?: string;
  '@creation'?: string;
  '@modification'?: string;
  realEstate?: RealEstate;
}

/**
 * Real Estate Data (Core Property Information)
 */
export interface RealEstate {
  '@id'?: string;
  '@xsi.type'?: string;
  title?: string;
  description?: string;
  descriptionNote?: string;
  furnishingNote?: string;
  locationNote?: string;
  otherNote?: string;

  // Address Information
  address?: Address;

  // Price Information
  price?: Price;
  calculatedTotalRent?: {
    totalRent?: {
      value?: number;
    };
  };

  // Property Dimensions
  livingSpace?: number;
  numberOfRooms?: number;
  numberOfBedRooms?: number;
  numberOfBathRooms?: number;
  floor?: number;
  numberOfFloors?: number;

  // Features
  balcony?: boolean;
  garden?: boolean;
  terrace?: boolean;
  cellar?: boolean;
  lift?: boolean;
  builtInKitchen?: boolean;
  guestToilet?: boolean;
  handicappedAccessible?: boolean;
  petsAllowed?: string;

  // Energy & Condition
  energyEfficiencyClass?: string;
  condition?: string;
  heatingType?: string;

  // Construction Info
  constructionYear?: number;
  freeFrom?: string;

  // Media
  titlePicture?: {
    '@href'?: string;
  };
  galleryAttachments?: {
    attachment?: Array<{
      '@href'?: string;
    }>;
  };

  // Agency/Contact Information
  contactDetails?: ContactDetails;
  realtorCompanyName?: string;
  commercializationType?: string;
}

/**
 * Address Information
 */
export interface Address {
  street?: string;
  houseNumber?: string;
  postcode?: string;
  city?: string;
  quarter?: string;
  wgs84Coordinate?: {
    latitude?: number;
    longitude?: number;
  };
}

/**
 * Price Information
 */
export interface Price {
  value?: number;
  currency?: string;
  marketingType?: string;
}

/**
 * Contact Details
 */
export interface ContactDetails {
  firstname?: string;
  lastname?: string;
  company?: string;
  phoneNumber?: string;
  cellPhoneNumber?: string;
  email?: string;
}

/**
 * Normalized Property Output
 */
export interface NormalizedProperty {
  id: string;
  title: string;
  price: number;
  currency: string;
  propertyType: PropertyCategory;
  transactionType: TransactionType;

  location: {
    city: string;
    region?: string;
    postcode?: string;
    address?: string;
    country: string;
    coordinates?: {
      lat: number;
      lon: number;
    };
  };

  details: {
    sqm?: number;
    rooms?: number;
    bedrooms?: number;
    bathrooms?: number;
    floor?: number;
    totalFloors?: number;
    constructionYear?: number;
    description?: string;
    availableFrom?: string;
    propertyAge?: number;
  };

  features: string[];
  images: string[];

  agent?: {
    name?: string;
    phone?: string;
    email?: string;
    agency?: string;
    isPrivate: boolean;
  };

  url: string;
  scrapedAt: string;

  metadata?: {
    marketingType?: string;
    condition?: string;
    heatingType?: string;
    petsAllowed?: string;
    originalPrice?: number;
    originalCurrency?: string;
    conversionRate?: number;
    pricePerSqm?: number;
    [key: string]: any;
  };
}

/**
 * Scraper Result
 */
export interface ScraperResult {
  properties: NormalizedProperty[];
  totalFound: number;
  pagesScraped: number;
  errors: string[];
}

/**
 * Scraper Options
 */
export interface ScraperOptions {
  transactionTypes?: TransactionType[];
  propertyTypes?: PropertyCategory[];
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
 * Performance Metrics
 */
export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  propertiesCount: number;
  listingsPerSecond: number;
  averageResponseTime: number;
  errorCount: number;
}

/**
 * German Property Field Mapping
 */
export interface GermanFieldMapping {
  german: string;
  english: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
}

/**
 * API Geocode Information
 */
export interface GeocodeInfo {
  name: string;
  geocode: string;
  type: string;
  listingCount?: number;
  region?: string;
}

/**
 * Batch Processing Request
 */
export interface BatchRequest {
  searches: SearchRequest[];
  parallel?: boolean;
  maxConcurrent?: number;
}

/**
 * Batch Processing Result
 */
export interface BatchResult {
  results: ScraperResult[];
  totalDuration: number;
  totalProperties: number;
  failedSearches: Array<{
    search: SearchRequest;
    error: string;
  }>;
}

/**
 * Export Formats
 */
export type ExportFormat = 'json' | 'csv' | 'jsonl' | 'parquet';

/**
 * Export Options
 */
export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  prettyPrint?: boolean;
  includeMetadata?: boolean;
  fields?: Array<keyof NormalizedProperty>;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    error: string;
    value: any;
  }>;
  warnings: Array<{
    field: string;
    warning: string;
  }>;
}

/**
 * German Text Analysis Result
 */
export interface GermanTextAnalysis {
  original: string;
  normalized: string;
  containsUmlauts: boolean;
  foundPatterns: string[];
  suggestedAmenities: string[];
}

/**
 * Rate Limiting Configuration
 */
export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * API Client Configuration
 */
export interface ApiClientConfig {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessSecret: string;
  timeout?: number;
  rateLimit?: RateLimitConfig;
}

/**
 * Helper type for making properties optional
 */
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Helper type for required nested properties
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export default {
  RealEstateType,
  PropertyCategory,
  TransactionType,
  PropertyCondition,
  HeatingType,
  EnergyClass,
  ParkingType,
  BerlinDistrict
};
