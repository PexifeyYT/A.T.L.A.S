import { OHLCVData } from '@core/types';

declare global {
  interface Window {
    api: {
      fetchMarketData: (symbol: string, timeframe: string) => Promise<{ success: boolean; data: OHLCVData; error?: string }>;
      runAnalysis: (symbol: string, timeframe: string, data: OHLCVData) => Promise<{ success: boolean; data: any; error?: string }>;
      getPerformanceStats: () => Promise<{ success: boolean; data: any; error?: string }>;
      searchSymbols: (query: string) => Promise<{ success: boolean; data: Array<{ symbol: string; name: string; type: string; exchange: string }>; error?: string }>;
      fetchLiveQuote: (symbol: string) => Promise<{ success: boolean; data: { price: number; change: number; changePercent: number } | null; error?: string }>;
      saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
      loadSettings: () => Promise<{ success: boolean; data: any; error?: string }>;
    };
  }
}

export {};
