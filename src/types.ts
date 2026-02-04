/**
 * ImmobilienScout24 Scraper - Type Definitions
 */

// Legacy Property interface (for compatibility with old code)
export interface Property {
  id: string;
  title: string;
  price: number;
  currency: string;
  propertyType: string;
  transactionType: string;
  source?: string;
  location: {
    address?: string;
    city: string;
    region?: string;
    postcode?: string;
    country: string;
    coordinates?: { lat: number; lon: number };
  };
  details?: {
    sqm?: number;
    rooms?: number;
    bedrooms?: number;
    bathrooms?: number;
    floor?: number;
    totalFloors?: number;
    constructionYear?: number;
    availableFrom?: string;
    description?: string;
  };
  features: string[];
  amenities?: any;
  agent?: {
    name?: string;
    agency?: string;
    phone?: string;
    email?: string;
    isPrivate?: boolean;
  };
  metadata?: any;
  images?: string[];
  description?: string;
  url: string;
  scrapedAt?: string;
}

export interface ScraperResult {
  properties: Property[];
  totalFound: number;
  pagesScraped: number;
  errors: string[];
}

export interface ScraperConfig {
  portal: string;
  country?: string;
  baseUrl: string;
  transactionTypes?: ('sale' | 'rent')[];
  propertyTypes?: string[];
  useStealthBrowser?: boolean;
  needsProxy?: boolean;
  requestDelay?: number;
  rateLimit?: number;
  maxRetries?: number;
  maxConcurrent?: number;
  navigationTimeout?: number;
  detailTimeout?: number;
  recheckAfterDays?: number;
  recheckBatchSize?: number;
  [key: string]: any;  // Allow additional fields
}

export interface ImmoscoutProperty {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  area: number | null;
  areaUnit: string;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  buildingYear: number | null;
  energyClass: string | null;
  furnished: boolean | null;
  parking: boolean | null;
  balcony: boolean | null;
  terrace: boolean | null;
  garden: boolean | null;
  elevator: boolean | null;
  amenities: string[];
  images: string[];
  listingType: 'sale' | 'rent' | 'unknown';
  propertyType: 'apartment' | 'house' | 'land' | 'commercial' | 'other' | 'unknown';
  agentName: string | null;
  agentPhone: string | null;
  agentEmail: string | null;
  agencyName: string | null;
  isAgency: boolean;
  url: string;
  postedAt: string | null;
  updatedAt: string | null;
  viewCount: number | null;
}

export interface ImmoscoutOptions {
  city?: string;
  listingType?: 'buy' | 'rent';
  propertyType?: 'apartment' | 'house' | 'land' | 'commercial';
  maxPages?: number;
  headless?: boolean;
  rateLimit?: number;
  timeout?: number;
  retryAttempts?: number;
}

export interface ScraperStats {
  totalProperties: number;
  totalPages: number;
  successCount: number;
  errorCount: number;
  startTime: number;
  endTime: number;
  duration: number;
}
