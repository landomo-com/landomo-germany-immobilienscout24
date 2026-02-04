/**
 * Example: ImmobilienScout24 Scraper with Core Service Integration
 *
 * This example demonstrates how to:
 * 1. Scrape properties from ImmobilienScout24
 * 2. Transform them to StandardProperty format
 * 3. Send them to the Landomo Core Service API
 */

import { ImmobilienScout24Scraper, GEOCODES } from './scraper';
import { transformToStandard } from './transformer';
import { sendToCoreService, sendBulkToCoreService, coreServiceClient } from './core-service-client';
import { createLogger } from './logger';

const logger = createLogger('CoreIntegrationExample');

/**
 * Example 1: Scrape and send properties individually
 */
async function exampleIndividualIngestion() {
  logger.info('Example 1: Individual property ingestion');

  const scraper = new ImmobilienScout24Scraper({
    geocodes: [GEOCODES.BERLIN],
    transactionTypes: ['rent'],
    propertyTypes: ['apartment'],
    maxPages: 1,
    pageSize: 10,
    verbose: true
  });

  // Scrape properties
  const result = await scraper.scrape();

  logger.info(`Scraped ${result.properties.length} properties`);

  // Transform and send each property to Core Service
  for (const property of result.properties) {
    try {
      // Transform to StandardProperty format
      const standardized = transformToStandard(property);

      // Extract portal ID from property ID (remove 'is24-' prefix)
      const portalId = property.id.replace('is24-', '');

      // Send to Core Service
      const success = await sendToCoreService(portalId, standardized, property);

      if (success) {
        logger.info(`✓ Property ${portalId} sent to Core Service`);
      } else {
        logger.error(`✗ Failed to send property ${portalId}`);
      }
    } catch (error) {
      logger.error(`Error processing property ${property.id}: ${error}`);
    }
  }

  logger.info(`Ingestion complete. Sent ${result.properties.length} properties.`);
}

/**
 * Example 2: Scrape and send properties in bulk
 */
async function exampleBulkIngestion() {
  logger.info('Example 2: Bulk property ingestion');

  const scraper = new ImmobilienScout24Scraper({
    geocodes: [GEOCODES.BERLIN],
    transactionTypes: ['sale'],
    propertyTypes: ['apartment'],
    maxPages: 2,
    pageSize: 20,
    verbose: true
  });

  // Scrape properties
  const result = await scraper.scrape();

  logger.info(`Scraped ${result.properties.length} properties`);

  // Transform all properties
  const transformedProperties = result.properties.map(property => ({
    portalId: property.id.replace('is24-', ''),
    standardized: transformToStandard(property),
    raw: property
  }));

  // Send in bulk (batch size: 100)
  const batchSize = 100;
  for (let i = 0; i < transformedProperties.length; i += batchSize) {
    const batch = transformedProperties.slice(i, i + batchSize);

    try {
      const success = await sendBulkToCoreService(batch);

      if (success) {
        logger.info(`✓ Batch ${Math.floor(i / batchSize) + 1} sent to Core Service (${batch.length} properties)`);
      } else {
        logger.error(`✗ Failed to send batch ${Math.floor(i / batchSize) + 1}`);
      }
    } catch (error) {
      logger.error(`Error sending batch: ${error}`);
    }
  }

  logger.info(`Bulk ingestion complete. Sent ${transformedProperties.length} properties.`);
}

/**
 * Example 3: Check Core Service health before scraping
 */
async function exampleWithHealthCheck() {
  logger.info('Example 3: With health check');

  // Check if Core Service is enabled
  if (!coreServiceClient.isEnabled()) {
    logger.warn('Core Service integration is disabled. Set ENABLE_CORE_SERVICE=true in .env');
    return;
  }

  // Health check
  const isHealthy = await coreServiceClient.healthCheck();

  if (!isHealthy) {
    logger.error('Core Service is not available. Aborting scrape.');
    return;
  }

  logger.info('✓ Core Service is healthy');

  // Proceed with scraping
  const scraper = new ImmobilienScout24Scraper({
    geocodes: [GEOCODES.BERLIN],
    transactionTypes: ['rent'],
    propertyTypes: ['apartment'],
    maxPages: 1,
    pageSize: 5,
    verbose: true
  });

  const result = await scraper.scrape();

  // Send to Core Service
  for (const property of result.properties) {
    const standardized = transformToStandard(property);
    const portalId = property.id.replace('is24-', '');
    await sendToCoreService(portalId, standardized, property);
  }

  logger.info(`Sent ${result.properties.length} properties to Core Service`);
}

/**
 * Example 4: Transform a single property (for testing)
 */
async function exampleTransformSingle() {
  logger.info('Example 4: Transform single property');

  const scraper = new ImmobilienScout24Scraper({
    geocodes: [GEOCODES.BERLIN],
    transactionTypes: ['rent'],
    propertyTypes: ['apartment'],
    maxPages: 1,
    pageSize: 1,
    verbose: true
  });

  const result = await scraper.scrape();

  if (result.properties.length === 0) {
    logger.error('No properties found');
    return;
  }

  const property = result.properties[0];

  logger.info('Original property:');
  logger.info(JSON.stringify(property, null, 2));

  const standardized = transformToStandard(property);

  logger.info('\nTransformed to StandardProperty:');
  logger.info(JSON.stringify(standardized, null, 2));

  logger.info('\nCountry-specific fields:');
  logger.info(JSON.stringify(standardized.country_specific, null, 2));
}

/**
 * Run examples
 */
async function main() {
  const example = process.argv[2] || '1';

  switch (example) {
    case '1':
      await exampleIndividualIngestion();
      break;
    case '2':
      await exampleBulkIngestion();
      break;
    case '3':
      await exampleWithHealthCheck();
      break;
    case '4':
      await exampleTransformSingle();
      break;
    default:
      logger.error('Invalid example. Use: npm run example [1-4]');
      logger.info('Examples:');
      logger.info('  1 - Individual property ingestion');
      logger.info('  2 - Bulk property ingestion');
      logger.info('  3 - With health check');
      logger.info('  4 - Transform single property');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    logger.error(`Error: ${error}`);
    process.exit(1);
  });
}
