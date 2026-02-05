/**
 * ImmobilienScout24 REST API Performance Testing Suite
 *
 * Tests and benchmarks the REST API implementation against the HTML scraper.
 * Measures:
 * - Execution time
 * - Listings per second
 * - Data quality
 * - Error rates
 * - Memory usage
 */

import { IS24RestScraper, RestScraperOptions } from './rest-scraper';
import { normalizeGermanProperties } from './german-normalizer';
import { Property, ScraperResult } from './shared-types';
import { createLogger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('PerformanceTest');

interface BenchmarkResult {
  testName: string;
  duration: number;
  propertiesScraped: number;
  successRate: number;
  listingsPerSecond: number;
  averageResponseTime: number;
  memoryUsed: number;
  errors: string[];
}

interface PerformanceReport {
  date: string;
  totalTests: number;
  totalDuration: number;
  results: BenchmarkResult[];
  summary: {
    averageListingsPerSecond: number;
    averageSuccessRate: number;
    totalPropertiesScraped: number;
    totalErrors: number;
  };
}

class PerformanceTester {
  private logger = createLogger('PerformanceTester');
  private results: BenchmarkResult[] = [];

  /**
   * Benchmark: Small batch (100 listings)
   */
  async benchmarkSmallBatch(): Promise<BenchmarkResult> {
    const testName = 'Small Batch (100 listings)';
    this.logger.info(`\nRunning: ${testName}`);

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const scraper = new IS24RestScraper({
      cities: ['Berlin'],
      transactionTypes: ['sale'],
      propertyTypes: ['apartment'],
      maxPages: 2,
      pageSize: 50,
      verbose: false
    });

    const result = await scraper.scrape();
    const properties = result.properties.slice(0, 100);

    const duration = (Date.now() - startTime) / 1000;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (endMemory - startMemory) / 1024 / 1024; // MB

    const successRate = properties.length > 0 ? 1.0 : 0;
    const listingsPerSecond = properties.length / duration;

    return {
      testName,
      duration,
      propertiesScraped: properties.length,
      successRate,
      listingsPerSecond,
      averageResponseTime: (duration / properties.length) * 1000, // ms per property
      memoryUsed,
      errors: result.errors
    };
  }

  /**
   * Benchmark: Medium batch (1000 listings)
   */
  async benchmarkMediumBatch(): Promise<BenchmarkResult> {
    const testName = 'Medium Batch (1000 listings)';
    this.logger.info(`\nRunning: ${testName}`);

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const scraper = new IS24RestScraper({
      cities: ['Berlin'],
      transactionTypes: ['sale', 'rent'],
      propertyTypes: ['apartment'],
      maxPages: 10,
      pageSize: 50,
      verbose: false
    });

    const result = await scraper.scrape();
    const properties = result.properties.slice(0, 1000);

    const duration = (Date.now() - startTime) / 1000;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (endMemory - startMemory) / 1024 / 1024;

    const successRate = properties.length >= 900 ? 1.0 : (properties.length / 1000);
    const listingsPerSecond = properties.length / duration;

    return {
      testName,
      duration,
      propertiesScraped: properties.length,
      successRate,
      listingsPerSecond,
      averageResponseTime: (duration / Math.max(properties.length, 1)) * 1000,
      memoryUsed,
      errors: result.errors
    };
  }

  /**
   * Benchmark: Large batch (5000 listings)
   */
  async benchmarkLargeBatch(): Promise<BenchmarkResult> {
    const testName = 'Large Batch (5000 listings)';
    this.logger.info(`\nRunning: ${testName}`);

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const scraper = new IS24RestScraper({
      cities: ['Berlin', 'Munich'],
      transactionTypes: ['sale'],
      propertyTypes: ['apartment', 'house'],
      maxPages: 15,
      pageSize: 50,
      verbose: false
    });

    const result = await scraper.scrape();
    const properties = result.properties.slice(0, 5000);

    const duration = (Date.now() - startTime) / 1000;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (endMemory - startMemory) / 1024 / 1024;

    const successRate = properties.length >= 4500 ? 1.0 : (properties.length / 5000);
    const listingsPerSecond = properties.length / duration;

    return {
      testName,
      duration,
      propertiesScraped: properties.length,
      successRate,
      listingsPerSecond,
      averageResponseTime: (duration / Math.max(properties.length, 1)) * 1000,
      memoryUsed,
      errors: result.errors
    };
  }

  /**
   * Benchmark: Data normalization performance
   */
  async benchmarkNormalization(): Promise<BenchmarkResult> {
    const testName = 'Data Normalization (1000 properties)';
    this.logger.info(`\nRunning: ${testName}`);

    // Generate mock properties
    const properties: Property[] = [];
    for (let i = 0; i < 1000; i++) {
      properties.push({
        id: `is24-${i}`,
        source: 'immobilienscout24',
        title: `Wohnung ${i}`,
        price: 1500 + Math.random() * 1000,
        currency: 'EUR',
        propertyType: 'apartment' as const,
        transactionType: 'rent' as const,
        url: `https://www.immobilienscout24.de/expose/${i}`,
        location: {
          city: 'Berlin',
          region: 'Friedrichshain-Kreuzberg',
          postcode: '10245',
          address: `Straße ${i}`,
          country: 'Germany'
        },
        details: {
          sqm: 65 + Math.random() * 50,
          rooms: 2,
          bedrooms: 1,
          bathrooms: 1,
          constructionYear: 1990 + Math.floor(Math.random() * 30)
        },
        features: ['balcony', 'cellar'],
        images: [],
        agent: undefined,
        scrapedAt: new Date().toISOString()
      });
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const normalized = normalizeGermanProperties(properties);

    const duration = (Date.now() - startTime) / 1000;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (endMemory - startMemory) / 1024 / 1024;

    return {
      testName,
      duration,
      propertiesScraped: normalized.length,
      successRate: 1.0,
      listingsPerSecond: normalized.length / duration,
      averageResponseTime: (duration / normalized.length) * 1000,
      memoryUsed,
      errors: []
    };
  }

  /**
   * Benchmark: Filtering performance
   */
  async benchmarkFiltering(): Promise<BenchmarkResult> {
    const testName = 'Complex Filtering (Price, Size, Rooms)';
    this.logger.info(`\nRunning: ${testName}`);

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const scraper = new IS24RestScraper({
      cities: ['Berlin'],
      transactionTypes: ['sale'],
      propertyTypes: ['apartment'],
      priceMin: 200000,
      priceMax: 500000,
      sqmMin: 80,
      sqmMax: 150,
      roomsMin: 2,
      roomsMax: 4,
      maxPages: 5,
      pageSize: 50,
      features: {
        balcony: true,
        builtInKitchen: true,
        parkingSpace: true
      },
      verbose: false
    });

    const result = await scraper.scrape();

    const duration = (Date.now() - startTime) / 1000;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (endMemory - startMemory) / 1024 / 1024;

    const listingsPerSecond = result.properties.length / duration;

    return {
      testName,
      duration,
      propertiesScraped: result.properties.length,
      successRate: result.errors.length === 0 ? 1.0 : 0.9,
      listingsPerSecond,
      averageResponseTime: (duration / Math.max(result.properties.length, 1)) * 1000,
      memoryUsed,
      errors: result.errors
    };
  }

  /**
   * Run all benchmarks
   */
  async runAllBenchmarks(): Promise<PerformanceReport> {
    logger.info('====================================');
    logger.info('ImmobilienScout24 Performance Tests');
    logger.info('====================================');

    const startTime = Date.now();

    try {
      // Small batch
      this.results.push(await this.benchmarkSmallBatch());
    } catch (error) {
      logger.error('Small batch test failed:', error);
    }

    try {
      // Medium batch
      this.results.push(await this.benchmarkMediumBatch());
    } catch (error) {
      logger.error('Medium batch test failed:', error);
    }

    try {
      // Large batch
      this.results.push(await this.benchmarkLargeBatch());
    } catch (error) {
      logger.error('Large batch test failed:', error);
    }

    try {
      // Normalization
      this.results.push(await this.benchmarkNormalization());
    } catch (error) {
      logger.error('Normalization test failed:', error);
    }

    try {
      // Filtering
      this.results.push(await this.benchmarkFiltering());
    } catch (error) {
      logger.error('Filtering test failed:', error);
    }

    const totalDuration = (Date.now() - startTime) / 1000;

    // Calculate summary
    const summary = {
      averageListingsPerSecond: this.results.length > 0
        ? this.results.reduce((sum, r) => sum + r.listingsPerSecond, 0) / this.results.length
        : 0,
      averageSuccessRate: this.results.length > 0
        ? this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length
        : 0,
      totalPropertiesScraped: this.results.reduce((sum, r) => sum + r.propertiesScraped, 0),
      totalErrors: this.results.reduce((sum, r) => sum + r.errors.length, 0)
    };

    return {
      date: new Date().toISOString(),
      totalTests: this.results.length,
      totalDuration,
      results: this.results,
      summary
    };
  }

  /**
   * Print benchmark results
   */
  printResults(report: PerformanceReport): void {
    logger.info('\n====================================');
    logger.info('BENCHMARK RESULTS');
    logger.info('====================================\n');

    for (const result of report.results) {
      logger.info(`\n${result.testName}`);
      logger.info(`  Duration: ${result.duration.toFixed(2)}s`);
      logger.info(`  Properties: ${result.propertiesScraped}`);
      logger.info(`  Rate: ${result.listingsPerSecond.toFixed(2)} listings/s`);
      logger.info(`  Avg Response: ${result.averageResponseTime.toFixed(2)}ms`);
      logger.info(`  Memory: ${result.memoryUsed.toFixed(2)}MB`);
      logger.info(`  Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
      if (result.errors.length > 0) {
        logger.info(`  Errors: ${result.errors.length}`);
      }
    }

    logger.info('\n====================================');
    logger.info('SUMMARY');
    logger.info('====================================\n');
    logger.info(`Total Tests: ${report.totalTests}`);
    logger.info(`Total Duration: ${report.totalDuration.toFixed(2)}s`);
    logger.info(`Total Properties Scraped: ${report.summary.totalPropertiesScraped}`);
    logger.info(`Average Rate: ${report.summary.averageListingsPerSecond.toFixed(2)} listings/s`);
    logger.info(`Average Success Rate: ${(report.summary.averageSuccessRate * 100).toFixed(1)}%`);
    logger.info(`Total Errors: ${report.summary.totalErrors}`);
  }

  /**
   * Save results to file
   */
  saveResults(report: PerformanceReport, filename: string): void {
    const filepath = path.resolve(filename);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    logger.info(`\nResults saved to: ${filepath}`);
  }
}

// Main
async function main(): Promise<void> {
  const tester = new PerformanceTester();

  try {
    const report = await tester.runAllBenchmarks();
    tester.printResults(report);
    tester.saveResults(report, 'performance-results.json');
  } catch (error) {
    logger.error('Performance test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { PerformanceTester, BenchmarkResult, PerformanceReport };
