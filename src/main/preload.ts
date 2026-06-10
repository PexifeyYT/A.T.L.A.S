import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getSymbolData: (symbol: string) => ipcRenderer.invoke('get-symbol-data', symbol),
});

declare global {
  interface Window {
    api: {
      getSymbolData: (symbol: string) => Promise<any>;
    };
  }
}
