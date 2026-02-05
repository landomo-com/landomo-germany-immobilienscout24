/**
 * Core Service API Client
 * Sends standardized property data to the Landomo Core Service
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from './config';
import { StandardProperty } from './transformer';
import { Property } from './shared-types';
import { createLogger } from './logger';

const logger = createLogger('CoreServiceClient');

/**
 * Ingestion payload for Core Service API
 */
export interface IngestionPayload {
  portal: string;
  portal_id: string;
  country: string;
  data: StandardProperty;
  raw_data: Property;
}

/**
 * Bulk ingestion payload
 */
export interface BulkIngestionPayload {
  portal: string;
  country: string;
  properties: Array<{
    portal_id: string;
    data: StandardProperty;
    raw_data: Property;
  }>;
}

/**
 * Core Service API Client
 */
export class CoreServiceClient {
  private client: AxiosInstance;
  private enabled: boolean;

  constructor() {
    this.enabled = config.coreService.enabled;

    this.client = axios.create({
      baseURL: config.coreService.url,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${config.coreService.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check if Core Service integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Send single property to Core Service
   */
  async ingestProperty(payload: IngestionPayload): Promise<boolean> {
    if (!this.enabled) {
      logger.debug('Core Service integration disabled, skipping ingestion');
      return false;
    }

    try {
      const response = await this.client.post('/properties/ingest', payload);

      if (response.status === 202) {
        logger.debug(`Property ${payload.portal_id} queued for ingestion`);
        return true;
      }

      return false;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(`Failed to ingest property ${payload.portal_id}: ${axiosError.message}`);

      if (axiosError.response) {
        logger.error(`Response status: ${axiosError.response.status}`);
        logger.error(`Response data: ${JSON.stringify(axiosError.response.data)}`);
      }

      return false;
    }
  }

  /**
   * Send multiple properties to Core Service (bulk ingestion)
   */
  async ingestBulk(payload: BulkIngestionPayload): Promise<boolean> {
    if (!this.enabled) {
      logger.debug('Core Service integration disabled, skipping bulk ingestion');
      return false;
    }

    try {
      const response = await this.client.post('/properties/bulk-ingest', payload);

      if (response.status === 202) {
        logger.info(`Bulk ingestion: ${payload.properties.length} properties queued`);
        return true;
      }

      return false;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(`Failed to ingest bulk properties: ${axiosError.message}`);

      if (axiosError.response) {
        logger.error(`Response status: ${axiosError.response.status}`);
        logger.error(`Response data: ${JSON.stringify(axiosError.response.data)}`);
      }

      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.error(`Core Service health check failed: ${error}`);
      return false;
    }
  }
}

/**
 * Default Core Service client instance
 */
export const coreServiceClient = new CoreServiceClient();

/**
 * Send property to Core Service (convenience function)
 */
export async function sendToCoreService(
  portalId: string,
  standardized: StandardProperty,
  raw: Property
): Promise<boolean> {
  const payload: IngestionPayload = {
    portal: config.portal,
    portal_id: portalId,
    country: config.country,
    data: standardized,
    raw_data: raw
  };

  return coreServiceClient.ingestProperty(payload);
}

/**
 * Send multiple properties to Core Service (convenience function)
 */
export async function sendBulkToCoreService(
  properties: Array<{ portalId: string; standardized: StandardProperty; raw: Property }>
): Promise<boolean> {
  const payload: BulkIngestionPayload = {
    portal: config.portal,
    country: config.country,
    properties: properties.map(p => ({
      portal_id: p.portalId,
      data: p.standardized,
      raw_data: p.raw
    }))
  };

  return coreServiceClient.ingestBulk(payload);
}
