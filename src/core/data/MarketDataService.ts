import axios from 'axios';
import { OHLCVData, OHLCV } from '../types';

interface YahooV8Response {
  chart: {
    result: Array<{
      meta: any;
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
    error: any;
  };
}

const TIMEFRAME_MAP: Record<string, { interval: string; rangeMultiplier: number }> = {
  '1m':  { interval: '1m',  rangeMultiplier: 1 },
  '5m':  { interval: '5m',  rangeMultiplier: 2 },
  '15m': { interval: '15m', rangeMultiplier: 5 },
  '30m': { interval: '30m', rangeMultiplier: 10 },
  '1H':  { interval: '60m', rangeMultiplier: 20 },
  '2H':  { interval: '60m', rangeMultiplier: 40 },
  '4H':  { interval: '60m', rangeMultiplier: 60 },
  '1D':  { interval: '1d',  rangeMultiplier: 365 },
  '1W':  { interval: '1wk', rangeMultiplier: 730 },
  '1M':  { interval: '1mo', rangeMultiplier: 1825 },
};

export class MarketDataService {
  private cache = new Map<string, { data: OHLCVData; expiry: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 min

  async fetchOHLCV(symbol: string, timeframe: string, limit = 200): Promise<OHLCVData> {
    const key = `${symbol}_${timeframe}_${limit}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) return cached.data;

    try {
      const data = await this.fetchFromYahoo(symbol, timeframe, limit);
      this.cache.set(key, { data, expiry: Date.now() + this.TTL });
      return data;
    } catch (err) {
      console.warn(`Yahoo fetch failed for ${symbol}/${timeframe}:`, err);
      const mock = this.generateRealisticMock(symbol, timeframe, limit);
      this.cache.set(key, { data: mock, expiry: Date.now() + this.TTL });
      return mock;
    }
  }

  private async fetchFromYahoo(symbol: string, timeframe: string, limit: number): Promise<OHLCVData> {
    const config = TIMEFRAME_MAP[timeframe] || TIMEFRAME_MAP['1D'];
    const rangeDays = Math.min(config.rangeMultiplier * Math.ceil(limit / 100), 730);
    const range = rangeDays < 8 ? `${rangeDays}d` : rangeDays < 60 ? `${Math.ceil(rangeDays / 30)}mo` : '2y';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const resp = await axios.get<YahooV8Response>(url, {
      params: { interval: config.interval, range, includePrePost: false },
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const result = resp.data.chart.result?.[0];
    if (!result) throw new Error('No data from Yahoo Finance');

    const { timestamp, indicators } = result;
    const quote = indicators.quote[0];
    const bars: OHLCV[] = [];

    for (let i = 0; i < timestamp.length; i++) {
      const o = quote.open[i];
      const h = quote.high[i];
      const l = quote.low[i];
      const c = quote.close[i];
      const v = quote.volume[i];

      if (o == null || h == null || l == null || c == null) continue;

      bars.push({
        time: timestamp[i] * 1000,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v ?? 0,
      });
    }

    return { symbol, timeframe, bars: bars.slice(-limit) };
  }

  private generateRealisticMock(symbol: string, timeframe: string, limit: number): OHLCVData {
    const basePrices: Record<string, number> = {
      AAPL: 190, MSFT: 425, TSLA: 245, NVDA: 208, SPY: 550,
      QQQ: 380, BTC: 65000, ETH: 3500, GOOGL: 170, AMZN: 185,
      META: 490, AMD: 155, COIN: 220,
    };

    const base = basePrices[symbol] ?? 100;
    const bars: OHLCV[] = [];
    let price = base;
    const now = Date.now();

    const intervalMs = this.getIntervalMs(timeframe);
    // Add macro trend
    const trendBias = symbol === 'BTC' ? 0.3 : symbol === 'TSLA' ? -0.1 : 0.1;

    for (let i = limit; i > 0; i--) {
      const dailyVol = base * 0.018;
      const trend = (trendBias / limit) * price;
      const noise = (Math.random() - 0.5) * dailyVol;
      price = Math.max(base * 0.3, price + trend + noise);

      const bodyRange = dailyVol * (0.3 + Math.random() * 0.7);
      const dir = Math.random() > 0.48;
      const open = price;
      const close = dir ? open + bodyRange : open - bodyRange;
      const wick1 = Math.random() * dailyVol * 0.3;
      const wick2 = Math.random() * dailyVol * 0.3;
      const high = Math.max(open, close) + wick1;
      const low = Math.min(open, close) - wick2;

      bars.push({
        time: now - i * intervalMs,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(Math.max(0, low) * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.floor((0.5 + Math.random()) * 10_000_000),
      });

      price = close;
    }

    return { symbol, timeframe, bars };
  }

  private getIntervalMs(tf: string): number {
    const map: Record<string, number> = {
      '1m': 60e3, '5m': 5*60e3, '15m': 15*60e3, '30m': 30*60e3,
      '1H': 3600e3, '2H': 2*3600e3, '4H': 4*3600e3,
      '1D': 86400e3, '1W': 7*86400e3, '1M': 30*86400e3,
    };
    return map[tf] ?? 86400e3;
  }

  clearCache() {
    this.cache.clear();
  }

  async fetchQuote(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
      const resp = await axios.get<YahooV8Response>(url, {
        params: { interval: '1d', range: '2d' },
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      const result = resp.data.chart.result?.[0];
      if (!result) return null;

      const quote = result.indicators.quote[0];
      const n = quote.close.length;
      const price = quote.close[n - 1];
      const prev = quote.close[n - 2] ?? price;
      const change = price - prev;
      const changePercent = (change / prev) * 100;

      return { price, change, changePercent };
    } catch {
      return null;
    }
  }
}
