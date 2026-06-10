import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { AnalysisEngine } from '../core/engine/AnalysisEngine';
import { DataFetcher } from '../core/data/DataFetcher';
import { SMCStrategy } from '../core/strategies/SMCStrategy';
import { TJRStrategy } from '../core/strategies/TJRStrategy';
import { WyckoffStrategy } from '../core/strategies/WyckoffStrategy';
import { ElliottWaveStrategy } from '../core/strategies/ElliottWaveStrategy';
import { VolumeProfileStrategy } from '../core/strategies/VolumeProfileStrategy';
import { MASystemStrategy } from '../core/strategies/MASystemStrategy';
import { MomentumStrategy } from '../core/strategies/MomentumStrategy';
import { OHLCVData, MarketContext } from '../core/types';

let mainWindow: BrowserWindow | null = null;

// Initialize analysis engine with strategies
const analysisEngine = new AnalysisEngine();
const dataFetcher = new DataFetcher();

// Register strategies (7 total in Phase 3)
analysisEngine.registerStrategy(new SMCStrategy());
analysisEngine.registerStrategy(new TJRStrategy());
analysisEngine.registerStrategy(new WyckoffStrategy());
analysisEngine.registerStrategy(new ElliottWaveStrategy());
analysisEngine.registerStrategy(new VolumeProfileStrategy());
analysisEngine.registerStrategy(new MASystemStrategy());
analysisEngine.registerStrategy(new MomentumStrategy());

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../renderer/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('fetch-market-data', async (_event, symbol: string, timeframe: string) => {
  try {
    const data = await dataFetcher.fetchOHLCV(symbol, timeframe, 100);
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle(
  'run-analysis',
  async (_event, symbol: string, _timeframe: string, ohlcvData: OHLCVData) => {
    try {
      const context: MarketContext = {
        symbol,
        timestamp: Date.now(),
        macroTrend: 'UPTREND',
        volatility: 0.5,
      };

      const result = await analysisEngine.analyze(ohlcvData, context);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },
);

ipcMain.handle('get-symbol-data', async (_event, symbol: string) => {
  try {
    const data = await dataFetcher.fetchOHLCV(symbol, '1D', 100);
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
});
