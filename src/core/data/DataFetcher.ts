import { OHLCVData, OHLCV } from '@core/types';

/**
 * Market data fetcher — Yahoo Finance + mock fallback
 * Phase 2: Real market data integration
 */
export class DataFetcher {
  private cache: Map<string, OHLCVData> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {}

  async fetchOHLCV(symbol: string, timeframe: string, limit: number = 100): Promise<OHLCVData> {
    const cacheKey = `${symbol}_${timeframe}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (Date.now() < expiry) {
        return this.cache.get(cacheKey)!;
      }
    }

    // Return mock data (Phase 3 will integrate real APIs)
    const mockData = this.generateMockData(symbol, timeframe, limit);
    this.cache.set(cacheKey, mockData);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
    return mockData;
  }


  private generateMockData(symbol: string, timeframe: string, limit: number): OHLCVData {
    const bars: OHLCV[] = [];
    let basePrice = this.getSymbolBasePrice(symbol);
    const now = Date.now();
    const intervalMs = this.getIntervalMs(timeframe);

    for (let i = limit; i > 0; i--) {
      // Add trend + noise
      const trend = Math.sin(i / limit) * 0.5;
      const noise = (Math.random() - 0.5) * 2;
      basePrice += (trend + noise) * (basePrice / 100);

      const open = basePrice;
      const close = basePrice + (Math.random() - 0.5) * basePrice * 0.02;
      const high = Math.max(open, close) + Math.random() * basePrice * 0.01;
      const low = Math.min(open, close) - Math.random() * basePrice * 0.01;

      bars.push({
        time: now - i * intervalMs,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.floor(Math.random() * 50000000),
      });
    }

    return {
      symbol,
      timeframe,
      bars,
    };
  }

  private getSymbolBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      AAPL: 190,
      MSFT: 425,
      TSLA: 245,
      NVDA: 208,
      SPY: 550,
      QQQ: 380,
      BTC: 65000,
      ETH: 3500,
    };
    return prices[symbol] || 100;
  }

  private getIntervalMs(timeframe: string): number {
    const intervals: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1H': 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000,
      '1W': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };
    return intervals[timeframe] || 24 * 60 * 60 * 1000;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}
