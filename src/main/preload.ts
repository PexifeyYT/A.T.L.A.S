import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getSymbolData: (symbol: string) => ipcRenderer.invoke('get-symbol-data', symbol),
  fetchMarketData: (symbol: string, timeframe: string) =>
    ipcRenderer.invoke('fetch-market-data', symbol, timeframe),
  runAnalysis: (symbol: string, timeframe: string, ohlcvData: any) =>
    ipcRenderer.invoke('run-analysis', symbol, timeframe, ohlcvData),
});

declare global {
  interface Window {
    api: {
      getSymbolData: (symbol: string) => Promise<any>;
      fetchMarketData: (symbol: string, timeframe: string) => Promise<any>;
      runAnalysis: (symbol: string, timeframe: string, ohlcvData: any) => Promise<any>;
    };
  }
}
