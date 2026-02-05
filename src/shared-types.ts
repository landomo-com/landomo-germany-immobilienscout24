/**
 * Shared type definitions for scraper
 * Replaces @shared/types dependency
 */

/**
 * Standardized property structure
 */
export interface Property {
  id: string;
  source: string;
  url: string;
  title: string;
  price: number;
  currency: string;
  propertyType: string;
  transactionType: 'sale' | 'rent';
  location: {
    address?: string;
    city: string;
    region?: string;
    postcode?: string;
    country: string;
    coordinates?: {
      lat: number;
      lon: number;
    };
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
    description?: string; // Additional description field
  };
  features: string[];
  images: string[];
  description?: string;
  agent?: {
    name: string;
    phone?: string;
    email?: string;
    agency?: string;
    isPrivate?: boolean;
  };
  metadata?: Record<string, any>;
  scrapedAt: string;
}

/**
 * Scraper configuration
 */
export interface ScraperConfig {
  portal: string;
  baseUrl: string;
  transactionTypes: string[];
  rateLimit: number;
  maxRetries: number;
}

/**
 * Scraper result
 */
export interface ScraperResult {
  properties: Property[];
  totalFound: number;
  pagesScraped: number;
  errors: string[];
}
