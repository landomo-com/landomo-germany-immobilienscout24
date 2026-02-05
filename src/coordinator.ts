/**
 * ImmobilienScout24 Coordinator - Phase 1: Property ID Discovery
 *
 * Discovers all property IDs from ImmobilienScout24 and pushes to Redis queue.
 *
 * Features:
 * - City-based discovery (German cities)
 * - Multiple property types (apartment, house)
 * - Multiple transaction types (rent, sale)
 * - Global deduplication via Redis Sets
 * - Queue-based architecture for distributed processing
 *
 * Usage:
 *   npm run coordinator
 */

import { ImmobilienScout24Scraper, GEOCODES, IS24ScraperOptions } from './scraper';
import { RedisQueue } from './redis-queue';
import { createLogger } from './logger';

const logger = createLogger('Coordinator');

// German cities with geocodes
const GERMAN_CITIES: Record<string, string> = {
  'Berlin': GEOCODES.BERLIN,
  // Add more cities as geocodes are discovered
};

export class ImmobilienScout24Coordinator {
  private queue: RedisQueue;
  private scraper: ImmobilienScout24Scraper;

  constructor() {
    this.queue = new RedisQueue('immobilienscout24');
    this.scraper = new ImmobilienScout24Scraper({
      verbose: true,
      rateLimit: 2000,
      pageSize: 20
    });
  }

  async initialize() {
    await this.queue.initialize();

    logger.info('Coordinator initialized');
  }

  /**
   * Discover property IDs for a specific search
   */
  async discoverProperties(
    city: string,
    geocode: string,
    transactionType: 'sale' | 'rent',
    propertyType: 'apartment' | 'house'
  ): Promise<number> {
    logger.info(`Discovering ${city} - ${propertyType} (${transactionType})...`);

    try {
      // Use scraper to search
      const properties = await this.scraper.scrapeSearch(
        transactionType,
        propertyType,
        geocode,
        10000 // Max results per search
      );

      // Extract IDs
      const ids = properties.map(p => p.id);

      // Push to queue (with deduplication)
      const newCount = await this.queue.pushListingIds(ids);

      logger.info(
        `${city} - ${propertyType} (${transactionType}): Found ${ids.length}, New: ${newCount}`
      );

      return newCount;
    } catch (error) {
      logger.error(
        `Error discovering ${city} - ${propertyType} (${transactionType}):`,
        error
      );
      return 0;
    }
  }

  /**
   * Discover all German cities
   */
  async discoverAllCities(): Promise<void> {
    logger.info('=== STARTING CITY-BASED DISCOVERY ===\n');

    const transactionTypes: ('sale' | 'rent')[] = ['sale', 'rent'];
    const propertyTypes: ('apartment' | 'house')[] = ['apartment', 'house'];

    let totalCities = 0;
    let totalNewIds = 0;

    for (const [cityName, geocode] of Object.entries(GERMAN_CITIES)) {
      totalCities++;

      for (const transactionType of transactionTypes) {
        for (const propertyType of propertyTypes) {
          const newCount = await this.discoverProperties(
            cityName,
            geocode,
            transactionType,
            propertyType
          );

          totalNewIds += newCount;

          // Rate limiting
          await this.randomDelay(2000, 4000);
        }
      }
    }

    // Final stats
    const stats = await this.queue.getStats();

    logger.info('\n=== DISCOVERY COMPLETE ===');
    logger.info(`Cities processed: ${totalCities}`);
    logger.info(`Total discovered: ${stats.totalDiscovered.toLocaleString()}`);
    logger.info(`New IDs queued: ${totalNewIds.toLocaleString()}`);
    logger.info(`Queue depth: ${stats.queueDepth.toLocaleString()}\n`);
  }

  /**
   * Random delay for rate limiting
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async close() {
    await this.queue.close();
  }
}

// Main execution
async function main() {
  logger.info('Starting ImmobilienScout24 Coordinator');

  const coordinator = new ImmobilienScout24Coordinator();
  await coordinator.initialize();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await coordinator.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await coordinator.close();
    process.exit(0);
  });

  try {
    await coordinator.discoverAllCities();

    // Show final stats
    const queue = new RedisQueue('immobilienscout24');
    await queue.initialize();
    const stats = await queue.getStats();
    logger.info('=== FINAL QUEUE STATS ===', stats);
    await queue.close();

    await coordinator.close();
  } catch (error) {
    logger.error('Coordinator failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
