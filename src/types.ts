/**
 * ImmobilienScout24 Scraper - Type Definitions
 */

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
