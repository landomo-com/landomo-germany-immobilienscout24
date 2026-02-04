/**
 * Redis Queue Client for Distributed Scraping
 *
 * Provides queue-based architecture for scraping:
 * - Phase 1: Coordinator discovers IDs and pushes to queue
 * - Phase 2: Workers consume from queue and fetch details
 *
 * Features:
 * - Persistence (survives crashes)
 * - Resumability (stop and resume)
 * - Distributed processing (multiple workers)
 * - Deduplication (Redis Sets)
 * - Observability (queue depth, processed count)
 */

import Redis from 'ioredis';
import { createLogger } from './logger';

const logger = createLogger('RedisQueue');

export interface QueueStats {
  queueDepth: number;
  totalDiscovered: number;
  processedCount: number;
  failedCount: number;
  remaining: number;
  startedAt?: string;
}

export class RedisQueue {
  private redis: Redis;
  private queueKey: string;
  private allIdsKey: string;
  private processedIdsKey: string;
  private failedIdsKey: string;
  private retriesKey: string;
  private statsKey: string;

  constructor(
    portal: string,
    redisUrl?: string
  ) {
    // Connect to Redis
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    // Set up key namespaces
    const prefix = `landomo:${portal}`;
    this.queueKey = `${prefix}:queue`;
    this.allIdsKey = `${prefix}:all_ids`;
    this.processedIdsKey = `${prefix}:processed`;
    this.failedIdsKey = `${prefix}:failed`;
    this.retriesKey = `${prefix}:retries`;
    this.statsKey = `${prefix}:stats`;

    // Event handlers
    this.redis.on('connect', () => {
      logger.info('Redis connected');
    });

    this.redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });
  }

  /**
   * Initialize queue (set start time)
   */
  async initialize(): Promise<void> {
    const startedAt = await this.redis.hget(this.statsKey, 'started_at');
    if (!startedAt) {
      await this.redis.hset(this.statsKey, 'started_at', new Date().toISOString());
    }
  }

  /**
   * Push listing ID to queue (if not already queued/processed)
   */
  async pushListingId(id: string): Promise<boolean> {
    // Check if already in all_ids set
    const exists = await this.redis.sismember(this.allIdsKey, id);
    if (exists) {
      return false; // Already queued
    }

    // Add to queue and all_ids set atomically
    const pipeline = this.redis.pipeline();
    pipeline.lpush(this.queueKey, id);
    pipeline.sadd(this.allIdsKey, id);
    await pipeline.exec();

    return true;
  }

  /**
   * Push multiple listing IDs to queue
   */
  async pushListingIds(ids: string[]): Promise<number> {
    let addedCount = 0;

    // Process in batches of 1000 for efficiency
    const batchSize = 1000;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const pipeline = this.redis.pipeline();

      for (const id of batch) {
        pipeline.sadd(this.allIdsKey, id);
      }

      const results = await pipeline.exec();

      // Count how many were new (sadd returns 1 for new, 0 for existing)
      const newIds = batch.filter((id, idx) => results![idx][1] === 1);

      if (newIds.length > 0) {
        await this.redis.lpush(this.queueKey, ...newIds);
        addedCount += newIds.length;
      }
    }

    return addedCount;
  }

  /**
   * Pop next listing ID from queue (blocking)
   */
  async popListingId(timeoutSeconds: number = 5): Promise<string | null> {
    const result = await this.redis.brpop(this.queueKey, timeoutSeconds);
    if (!result) {
      return null;
    }
    return result[1]; // brpop returns [key, value]
  }

  /**
   * Check if listing ID is already processed
   */
  async isProcessed(id: string): Promise<boolean> {
    return (await this.redis.sismember(this.processedIdsKey, id)) === 1;
  }

  /**
   * Mark listing ID as processed
   */
  async markProcessed(id: string): Promise<void> {
    await this.redis.sadd(this.processedIdsKey, id);
  }

  /**
   * Mark listing ID as failed
   */
  async markFailed(id: string, error?: string): Promise<void> {
    await this.redis.sadd(this.failedIdsKey, id);
    if (error) {
      await this.redis.hset(`${this.failedIdsKey}:errors`, id, error);
    }
  }

  /**
   * Increment retry count for listing ID
   */
  async incrementRetry(id: string): Promise<number> {
    return await this.redis.hincrby(this.retriesKey, id, 1);
  }

  /**
   * Get retry count for listing ID
   */
  async getRetryCount(id: string): Promise<number> {
    const count = await this.redis.hget(this.retriesKey, id);
    return count ? parseInt(count) : 0;
  }

  /**
   * Re-queue failed listing with retry check
   */
  async requeueWithRetry(id: string, maxRetries: number = 3): Promise<boolean> {
    const retries = await this.incrementRetry(id);

    if (retries <= maxRetries) {
      await this.redis.lpush(this.queueKey, id);
      return true;
    } else {
      await this.markFailed(id, `Max retries (${maxRetries}) exceeded`);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const pipeline = this.redis.pipeline();
    pipeline.llen(this.queueKey);           // Queue depth
    pipeline.scard(this.allIdsKey);         // Total discovered
    pipeline.scard(this.processedIdsKey);   // Processed count
    pipeline.scard(this.failedIdsKey);      // Failed count
    pipeline.hget(this.statsKey, 'started_at');

    const results = await pipeline.exec();

    const queueDepth = (results![0][1] as number) || 0;
    const totalDiscovered = (results![1][1] as number) || 0;
    const processedCount = (results![2][1] as number) || 0;
    const failedCount = (results![3][1] as number) || 0;
    const startedAt = results![4][1] as string | null;

    return {
      queueDepth,
      totalDiscovered,
      processedCount,
      failedCount,
      remaining: queueDepth,
      startedAt: startedAt || undefined,
    };
  }

  /**
   * Get processing progress percentage
   */
  async getProgress(): Promise<number> {
    const stats = await this.getStats();
    if (stats.totalDiscovered === 0) return 0;
    return (stats.processedCount / stats.totalDiscovered) * 100;
  }

  /**
   * Clear all queue data (use with caution!)
   */
  async clear(): Promise<void> {
    await this.redis.del(
      this.queueKey,
      this.allIdsKey,
      this.processedIdsKey,
      this.failedIdsKey,
      this.retriesKey,
      this.statsKey
    );
    logger.warn('Queue data cleared');
  }

  /**
   * Get failed listing IDs
   */
  async getFailedIds(): Promise<string[]> {
    return await this.redis.smembers(this.failedIdsKey);
  }

  /**
   * Retry all failed listings
   */
  async retryFailedListings(): Promise<number> {
    const failedIds = await this.getFailedIds();

    if (failedIds.length === 0) {
      return 0;
    }

    // Remove from failed set and add back to queue
    const pipeline = this.redis.pipeline();
    for (const id of failedIds) {
      pipeline.srem(this.failedIdsKey, id);
      pipeline.lpush(this.queueKey, id);
      pipeline.hdel(this.retriesKey, id); // Reset retry count
    }
    await pipeline.exec();

    logger.info(`Re-queued ${failedIds.length} failed listings`);
    return failedIds.length;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    logger.info('Redis connection closed');
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.redis.status === 'ready';
  }
}
