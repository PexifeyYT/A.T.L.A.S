import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getSymbolData: (symbol: string) => ipcRenderer.invoke('get-symbol-data', symbol),
  fetchMarketData: (symbol: string, timeframe: string) =>
    ipcRenderer.invoke('fetch-market-data', symbol, timeframe),
  runAnalysis: (symbol: string, timeframe: string, ohlcvData: any) =>
    ipcRenderer.invoke('run-analysis', symbol, timeframe, ohlcvData),
  getPerformanceStats: () => ipcRenderer.invoke('get-performance-stats'),
  getAssetProfile: (symbol: string) => ipcRenderer.invoke('get-asset-profile', symbol),
  getLlmStatus: () => ipcRenderer.invoke('get-llm-status'),
  chatMessage: (message: string, context: any) =>
    ipcRenderer.invoke('chat-message', message, context),
  searchSymbols: (query: string) => ipcRenderer.invoke('search-symbols', query),
  fetchLiveQuote: (symbol: string) => ipcRenderer.invoke('fetch-live-quote', symbol),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
});
