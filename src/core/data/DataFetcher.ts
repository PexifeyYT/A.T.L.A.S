import axios from 'axios';
import { OHLCVData, OHLCV } from '@core/types';

/**
 * Market data fetcher — integrates with Polygon.io and Yahoo Finance
 * Currently uses mock data. Will be wired to real APIs in Phase 2.
 */
export class DataFetcher {
  private polygonApiKey: string;
  private cache: Map<string, OHLCVData> = new Map();

  constructor(polygonApiKey?: string) {
    this.polygonApiKey = polygonApiKey || '';
  }

  async fetchOHLCV(symbol: string, timeframe: string, limit: number = 100): Promise<OHLCVData> {
    const cacheKey = `${symbol}_${timeframe}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Try real API (will implement in Phase 2)
      // const data = await this.fetchFromPolygon(symbol, timeframe, limit);
      // return data;

      // For now, return mock data
      const mockData = this.generateMockData(symbol, timeframe, limit);
      this.cache.set(cacheKey, mockData);
      return mockData;
    } catch (error) {
      console.error(`Failed to fetch ${symbol}:`, error);
      return this.generateMockData(symbol, timeframe, limit);
    }
  }

  private async fetchFromPolygon(
    symbol: string,
    timeframe: string,
    limit: number,
  ): Promise<OHLCVData> {
    // TODO: Implement Polygon.io API integration
    throw new Error('Polygon.io integration not yet implemented');
  }

  private generateMockData(symbol: string, timeframe: string, limit: number): OHLCVData {
    const bars: OHLCV[] = [];
    let basePrice = 100;
    const now = Date.now();

    for (let i = limit; i > 0; i--) {
      basePrice += (Math.random() - 0.5) * 4;
      const open = basePrice;
      const close = basePrice + (Math.random() - 0.5) * 2;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;

      bars.push({
        time: now - i * 86400000,
        open,
        high,
        low,
        close,
        volume: Math.random() * 10000000,
      });
    }

    return {
      symbol,
      timeframe,
      bars,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}
