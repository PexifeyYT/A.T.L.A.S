import { OHLCVData } from '@core/types';

declare global {
  interface Window {
    api: {
      fetchMarketData: (symbol: string, timeframe: string) => Promise<{ success: boolean; data: OHLCVData; error?: string }>;
      runAnalysis: (symbol: string, timeframe: string, data: OHLCVData) => Promise<{ success: boolean; data: any; error?: string }>;
      getPerformanceStats: () => Promise<{ success: boolean; data: any; error?: string }>;
      getAssetProfile: (symbol: string) => Promise<{ success: boolean; data: any; error?: string }>;
      getSymbolData: (symbol: string) => Promise<{ success: boolean; data: OHLCVData; error?: string }>;
      getLlmStatus: () => Promise<{ success: boolean; data: { available: boolean; model: string | null } }>;
      chatMessage: (message: string, context: any) => Promise<{ success: boolean; data: string; error?: string }>;
      searchSymbols: (query: string) => Promise<{ success: boolean; data: Array<{ symbol: string; name: string; type: string; exchange: string }>; error?: string }>;
      fetchLiveQuote: (symbol: string) => Promise<{ success: boolean; data: { price: number; change: number; changePercent: number } | null; error?: string }>;
      saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
      loadSettings: () => Promise<{ success: boolean; data: any; error?: string }>;
      clearChatHistory: () => Promise<{ success: boolean }>;
    };
  }
}

export {};
