#!/usr/bin/env node

import { ImmobilienScout24Scraper, IS24ScraperOptions, GEOCODES } from './scraper';
import { Property, ScraperResult } from '@shared/types';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@shared/logger';

const logger = createLogger('module');

interface CliOptions {
  transactionType?: 'sale' | 'rent' | 'all';
  propertyType?: 'apartment' | 'house' | 'all';
  city?: string;
  geocode?: string;
  priceMin?: number;
  priceMax?: number;
  sqmMin?: number;
  sqmMax?: number;
  roomsMin?: number;
  roomsMax?: number;
  maxPages?: number;
  limit?: number;
  output?: string;
  format?: 'json' | 'csv';
  verbose?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-t':
      case '--transaction':
        options.transactionType = args[++i] as 'sale' | 'rent' | 'all';
        break;
      case '-p':
      case '--property-type':
        options.propertyType = args[++i] as 'apartment' | 'house' | 'all';
        break;
      case '-c':
      case '--city':
        options.city = args[++i]?.toUpperCase();
        break;
      case '-g':
      case '--geocode':
        options.geocode = args[++i];
        break;
      case '--price-min':
        options.priceMin = parseInt(args[++i], 10);
        break;
      case '--price-max':
        options.priceMax = parseInt(args[++i], 10);
        break;
      case '--sqm-min':
        options.sqmMin = parseInt(args[++i], 10);
        break;
      case '--sqm-max':
        options.sqmMax = parseInt(args[++i], 10);
        break;
      case '--rooms-min':
        options.roomsMin = parseInt(args[++i], 10);
        break;
      case '--rooms-max':
        options.roomsMax = parseInt(args[++i], 10);
        break;
      case '-m':
      case '--max-pages':
        options.maxPages = parseInt(args[++i], 10);
        break;
      case '-l':
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '-f':
      case '--format':
        options.format = args[++i] as 'json' | 'csv';
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  logger.info(`
ImmobilienScout24 Scraper - Germany Real Estate (Mobile API)

Usage: npx ts-node src/index.ts [options]

Options:
  -t, --transaction <type>    Transaction type: sale, rent, or all (default: all)
  -p, --property-type <type>  Property type: apartment, house, or all (default: all)
  -c, --city <name>           City preset (currently only BERLIN verified)
  -g, --geocode <id>          Custom geocode ID for region search
  --price-min <amount>        Minimum price in EUR
  --price-max <amount>        Maximum price in EUR
  --sqm-min <sqm>             Minimum living space in sqm
  --sqm-max <sqm>             Maximum living space in sqm
  --rooms-min <n>             Minimum number of rooms
  --rooms-max <n>             Maximum number of rooms
  -m, --max-pages <n>         Maximum pages to scrape per category (default: 5)
  -l, --limit <n>             Limit total results (default: unlimited)
  -o, --output <file>         Output file path (default: stdout)
  -f, --format <format>       Output format: json or csv (default: json)
  -v, --verbose               Enable verbose logging
  -h, --help                  Show this help message

Examples:
  # Scrape apartments for sale in Berlin (limit 10)
  npx ts-node src/index.ts -t sale -p apartment -c BERLIN -l 10

  # Scrape rentals in Berlin
  npx ts-node src/index.ts -t rent -c BERLIN -m 3

  # Scrape with price filter
  npx ts-node src/index.ts -t sale -c BERLIN --price-min 100000 --price-max 500000

  # Scrape with custom geocode
  npx ts-node src/index.ts -t sale -g 1276003001 -l 20

  # Scrape and save to file
  npx ts-node src/index.ts -t sale -c BERLIN -o results.json

API Info:
  This scraper uses the ImmobilienScout24 mobile API.
  Base URL: https://api.mobile.immobilienscout24.de
  Endpoints: /search/total, /search/list (POST), /expose/{id} (GET)
  No authentication required.
  User-Agent: ImmoScout_27.12_26.2_._

Note: Only Berlin geocode (1276003001) has been verified to work.
      Other geocodes may require different formats.
`);
}

function propertiesToCsv(properties: Property[]): string {
  if (properties.length === 0) return '';

  const headers = [
    'id', 'title', 'price', 'currency', 'propertyType', 'transactionType',
    'city', 'region', 'address', 'country', 'lat', 'lon',
    'sqm', 'bedrooms', 'bathrooms', 'rooms', 'floor',
    'features', 'agency', 'url', 'scrapedAt'
  ];

  const rows = properties.map(p => [
    p.id,
    `"${(p.title || '').replace(/"/g, '""')}"`,
    p.price,
    p.currency,
    p.propertyType,
    p.transactionType,
    p.location.city,
    p.location.region || '',
    `"${(p.location.address || '').replace(/"/g, '""')}"`,
    p.location.country,
    p.location.coordinates?.lat || '',
    p.location.coordinates?.lon || '',
    p.details.sqm || '',
    p.details.bedrooms || '',
    p.details.bathrooms || '',
    p.details.rooms || '',
    p.details.floor || '',
    `"${p.features.join('; ')}"`,
    `"${(p.agent?.agency || '').replace(/"/g, '""')}"`,
    p.url,
    p.scrapedAt
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

async function main(): Promise<void> {
  const options = parseArgs();

  logger.info('ImmobilienScout24 Scraper (Mobile API)');
  logger.info('======================================\n');

  // Build scraper options
  const scraperOptions: IS24ScraperOptions = {
    verbose: options.verbose,
    maxPages: options.maxPages || 5,
    priceMin: options.priceMin,
    priceMax: options.priceMax,
    livingSpaceMin: options.sqmMin,
    livingSpaceMax: options.sqmMax,
    roomsMin: options.roomsMin,
    roomsMax: options.roomsMax
  };

  // Set transaction types
  if (options.transactionType && options.transactionType !== 'all') {
    scraperOptions.transactionTypes = [options.transactionType];
  }

  // Set property types
  if (options.propertyType && options.propertyType !== 'all') {
    scraperOptions.propertyTypes = [options.propertyType];
  }

  // Set geocode
  if (options.city) {
    const geocode = GEOCODES[options.city as keyof typeof GEOCODES];
    if (geocode) {
      scraperOptions.geocodes = [geocode];
      logger.info(`City: ${options.city} (geocode: ${geocode})`);
    } else {
      logger.error(`Unknown city: ${options.city}`);
      logger.info("Available cities: " + Object.keys(GEOCODES).join(', '));
      process.exit(1);
    }
  } else if (options.geocode) {
    scraperOptions.geocodes = [options.geocode];
    logger.info(`Geocode: ${options.geocode}`);
  }

  const scraper = new ImmobilienScout24Scraper(scraperOptions);

  try {
    logger.info('Starting scrape...');
    const actualTransactionTypes = scraperOptions.transactionTypes || ['sale', 'rent'];
    const actualPropertyTypes = scraperOptions.propertyTypes || ['apartment', 'house'];
    logger.info(`Transaction types: ${actualTransactionTypes.join(', ')}`);
    logger.info(`Property types: ${actualPropertyTypes.join(', ')}`);
    logger.info(`Max pages per category: ${scraperOptions.maxPages}`);
    if (options.limit) {
      logger.info(`Result limit: ${options.limit}`);
    }
    logger.info('');

    const result: ScraperResult = await scraper.scrape();

    // Apply limit if specified
    if (options.limit && result.properties.length > options.limit) {
      result.properties = result.properties.slice(0, options.limit);
    }

    logger.info('\nScrape completed!');

    // Calculate sale vs rent counts
    const saleCount = result.properties.filter(p => p.transactionType === 'sale').length;
    const rentCount = result.properties.filter(p => p.transactionType === 'rent').length;

    logger.info(`Total properties found: ${result.totalFound}`);
    logger.info(`Properties scraped: ${result.properties.length}`);
    logger.info(`  - Sale listings: ${saleCount}`);
    logger.info(`  - Rent listings: ${rentCount}`);
    logger.info(`Pages scraped: ${result.pagesScraped}`);

    if (result.errors.length > 0) {
      logger.info(`Errors: ${result.errors.length}`);
      for (const error of result.errors.slice(0, 5)) {
        logger.info(`  - ${error}`);
      }
      if (result.errors.length > 5) {
        logger.info(`  ... and ${result.errors.length - 5} more`);
      }
    }

    // Show sample of properties
    if (result.properties.length > 0) {
      logger.info('\nSample properties:');
      for (const prop of result.properties.slice(0, 3)) {
        logger.info(`  - ${prop.title}`);
        logger.info(`    Price: ${prop.price} ${prop.currency} (${prop.transactionType})`);
        logger.info(`    Location: ${prop.location.city}, ${prop.location.country}`);
        logger.info(`    Size: ${prop.details.sqm || '?'} sqm, ${prop.details.rooms || '?'} rooms`);
        logger.info(`    URL: ${prop.url}`);
        logger.info('');
      }
    }

    // Output results
    const outputFormat = options.format || 'json';
    let output: string;

    if (outputFormat === 'csv') {
      output = propertiesToCsv(result.properties);
    } else {
      output = JSON.stringify(result, null, 2);
    }

    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, output);
      logger.info(`Results saved to: ${outputPath}`);
    } else if (options.format === 'csv' || (options.format === 'json' && result.properties.length <= 5)) {
      logger.info('\n--- Results ---\n');
      logger.debug('Variable', output);
    }

  } catch (error) {
    logger.error('Scraper error:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { ImmobilienScout24Scraper, IS24ScraperOptions, GEOCODES };
export * from './parser';
export { getConfig } from './scraper';

// Run if called directly
if (require.main === module) {
  main().catch(err => logger.error('Error', err));
}
