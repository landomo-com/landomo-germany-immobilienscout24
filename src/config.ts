/**
 * ImmobilienScout24 Scraper Configuration
 */

export const config = {
  // Portal identification
  portal: 'immobilienscout24',
  country: 'germany',
  baseUrl: 'https://api.mobile.immobilienscout24.de',

  // Core Service API settings
  coreService: {
    url: process.env.CORE_SERVICE_URL || 'https://core.landomo.com/api/v1',
    apiKey: process.env.CORE_SERVICE_API_KEY || '',
    enabled: process.env.ENABLE_CORE_SERVICE === 'true'
  },

  // Rate limiting
  requestDelay: 1000,        // ms between requests
  maxConcurrent: 3,          // concurrent requests

  // Scraping settings
  useStealthBrowser: false,  // Set to true if bot detection issues
  needsProxy: false,

  // Timeouts
  navigationTimeout: 30000,
  detailTimeout: 60000,

  // Search parameters
  maxPagesPerSearch: 50,
  resultsPerPage: 20,

  // User agent for mobile API
  userAgent: 'ImmoScout_27.12_26.2_._',

  // Geocodes for major German cities
  geocodes: {
    BERLIN: '1276003001',
    // Add more geocodes as they are verified with the API
  }
};

/**
 * Get Core Service API URL
 */
export function getCoreServiceUrl(): string {
  return config.coreService.url;
}

/**
 * Get Core Service API key
 */
export function getCoreServiceApiKey(): string {
  return config.coreService.apiKey;
}

/**
 * Check if Core Service integration is enabled
 */
export function isCoreServiceEnabled(): boolean {
  return config.coreService.enabled;
}
