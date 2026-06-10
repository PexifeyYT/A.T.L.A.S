import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { AnalysisEngine } from '../core/engine/AnalysisEngine';
import { MarketDataService } from '../core/data/MarketDataService';
import { SMCStrategy } from '../core/strategies/SMCStrategy';
import { TJRStrategy } from '../core/strategies/TJRStrategy';
import { WyckoffStrategy } from '../core/strategies/WyckoffStrategy';
import { ElliottWaveStrategy } from '../core/strategies/ElliottWaveStrategy';
import { VolumeProfileStrategy } from '../core/strategies/VolumeProfileStrategy';
import { MASystemStrategy } from '../core/strategies/MASystemStrategy';
import { MomentumStrategy } from '../core/strategies/MomentumStrategy';
import { ClassicalPatternsStrategy } from '../core/strategies/ClassicalPatternsStrategy';
import { VolatilityStrategy } from '../core/strategies/VolatilityStrategy';
import { IntermarketStrategy } from '../core/strategies/IntermarketStrategy';
import { SentimentStrategy } from '../core/strategies/SentimentStrategy';
import { SeasonalityStrategy } from '../core/strategies/SeasonalityStrategy';
import { OrderFlowStrategy } from '../core/strategies/OrderFlowStrategy';
import { LearningEngine } from '../core/learning/LearningEngine';
import { OllamaService } from '../core/llm/OllamaService';
import { OutcomeChecker } from '../core/learning/OutcomeChecker';
import {
  initDatabase,
  savePrediction,
  saveOutcome,
  getModuleWeight,
  setModuleWeight,
  getAssetProfile,
  upsertAssetProfile,
  getStats,
  getPendingPredictions,
} from '../database/Database';
import { OHLCVData, MarketContext, Prediction } from '../core/types';
import { randomUUID } from 'crypto';

let mainWindow: BrowserWindow | null = null;

const analysisEngine = new AnalysisEngine();
const marketDataService = new MarketDataService();
const learningEngine = new LearningEngine();
const outcomeChecker = new OutcomeChecker(marketDataService);
const ollamaService = new OllamaService();

const allModuleNames = [
  'mod_smc', 'mod_tjr', 'mod_wyckoff', 'mod_elliott', 'mod_volume_profile',
  'mod_ma_systems', 'mod_momentum', 'mod_classical_ta', 'mod_volatility',
  'mod_intermarket', 'mod_sentiment', 'mod_seasonality', 'mod_orderflow',
];

const defaultWeights = new Map([
  ['mod_smc', 1.82], ['mod_tjr', 1.71], ['mod_wyckoff', 1.60],
  ['mod_volume_profile', 1.54], ['mod_ma_systems', 1.31], ['mod_classical_ta', 1.31],
  ['mod_momentum', 1.18], ['mod_volatility', 1.10], ['mod_intermarket', 0.95],
  ['mod_sentiment', 0.85], ['mod_seasonality', 0.72], ['mod_elliott', 0.71],
  ['mod_orderflow', 0.68],
]);

analysisEngine.registerStrategy(new SMCStrategy());
analysisEngine.registerStrategy(new TJRStrategy());
analysisEngine.registerStrategy(new WyckoffStrategy());
analysisEngine.registerStrategy(new ElliottWaveStrategy());
analysisEngine.registerStrategy(new VolumeProfileStrategy());
analysisEngine.registerStrategy(new MASystemStrategy());
analysisEngine.registerStrategy(new MomentumStrategy());
analysisEngine.registerStrategy(new ClassicalPatternsStrategy());
analysisEngine.registerStrategy(new VolatilityStrategy());
analysisEngine.registerStrategy(new IntermarketStrategy());
analysisEngine.registerStrategy(new SentimentStrategy());
analysisEngine.registerStrategy(new SeasonalityStrategy());
analysisEngine.registerStrategy(new OrderFlowStrategy());

const createWindow = () => {
  // isDev must be evaluated AFTER app is ready
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#131722',
    show: false, // don't show until ready-to-show to avoid blank flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // allow file:// cross-origin for local assets
    },
    titleBarStyle: 'default',
    title: 'ATLAS — AI Trading Analysis System',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Use loadFile for packaged app — handles file:// and relative assets correctly
    const rendererPath = path.join(__dirname, '..', '..', 'renderer', 'index.html');
    console.log('[ATLAS] Loading renderer from:', rendererPath);
    mainWindow.loadFile(rendererPath).catch(err => {
      console.error('[ATLAS] Failed to load renderer:', err);
      dialog.showErrorBox('Load Error', `Failed to load UI:\n${rendererPath}\n\n${err.message}`);
    });
  }

  // Log any renderer errors for debugging
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[ATLAS] Page failed to load:', code, desc, url);
  });

  mainWindow.webContents.on('crashed' as any, () => {
    console.error('[ATLAS] Renderer crashed');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', () => {
  try {
    initDatabase();
    learningEngine.initializeWeights(allModuleNames, defaultWeights);
    console.log('[ATLAS] Database initialized');
  } catch (err) {
    console.error('[ATLAS] DB init failed:', err);
  }

  ollamaService.init().catch(() => {});
  createWindow();
  setInterval(runLearningLoop, 30 * 60 * 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// Catch unhandled exceptions — show dialog instead of silent crash
process.on('uncaughtException', (err) => {
  console.error('[ATLAS] Uncaught exception:', err);
  dialog.showErrorBox('ATLAS Error', err.message + '\n\n' + err.stack);
});

async function runLearningLoop() {
  try {
    const pending = getPendingPredictions();
    console.log(`[ATLAS] Learning loop: ${pending.length} pending predictions`);

    for (const prediction of pending) {
      const outcome = await outcomeChecker.checkPrediction(prediction);
      saveOutcome(outcome);

      for (const moduleName of prediction.modulesAgreed) {
        const currentWeight = getModuleWeight(moduleName);
        const reward = outcome.directionCorrect ? 0.05 : -0.05;
        const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + reward));
        setModuleWeight(moduleName, newWeight);
        learningEngine.updateWeight(moduleName, outcome);
      }

      const stats = getStats();
      upsertAssetProfile(prediction.symbol, {
        accuracy: stats.accuracy,
        totalPredictions: stats.total,
        wins: stats.wins,
        notes: '',
      });
    }
  } catch (err) {
    console.error('[ATLAS] Learning loop error:', err);
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('fetch-market-data', async (_e, symbol: string, timeframe: string) => {
  try {
    // Use large limit to trigger max-range fetch for D/W/M timeframes
    const data = await marketDataService.fetchOHLCV(symbol, timeframe, 5000);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('run-analysis', async (_e, symbol: string, timeframe: string, ohlcvData: OHLCVData) => {
  try {
    const context: MarketContext = {
      symbol,
      timestamp: Date.now(),
      macroTrend: 'UPTREND',
      volatility: 0.5,
    };

    const result = await analysisEngine.analyze(ohlcvData, context);
    const llmText = await ollamaService.generateAnalysis(result);
    (result as any).llmText = llmText;
    (result as any).llmModel = ollamaService.getModel() ?? 'rule-based';

    if (result.confidence >= 6.0 && result.primarySignal.direction !== 'NEUTRAL') {
      const prediction: Prediction = {
        id: randomUUID(),
        symbol,
        timeframe,
        timestamp: Date.now(),
        direction: result.primarySignal.direction as 'LONG' | 'SHORT',
        entryZone: result.primarySignal.entryZone as [number, number],
        target1: result.primarySignal.target1,
        target2: result.primarySignal.target2 || result.primarySignal.target1 * 1.05,
        invalidation: result.primarySignal.invalidation,
        horizonBars: 12,
        modulesAgreed: result.modulesAgreed,
        conviction: result.confidence,
        status: 'PENDING',
      };
      savePrediction(prediction);
      result.predictionId = prediction.id;
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-performance-stats', async () => {
  try {
    const stats = getStats();
    const weights = learningEngine.getAllWeights();
    return { success: true, data: { ...stats, moduleWeights: Object.fromEntries(weights) } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-asset-profile', async (_e, symbol: string) => {
  try {
    const profile = getAssetProfile(symbol);
    return { success: true, data: profile };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-symbol-data', async (_e, symbol: string) => {
  try {
    const data = await marketDataService.fetchOHLCV(symbol, '1D', 200);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-llm-status', async () => {
  return {
    success: true,
    data: { available: ollamaService.isAvailable(), model: ollamaService.getModel() },
  };
});

ipcMain.handle('chat-message', async (_e, message: string, context: any) => {
  try {
    const reply = await ollamaService.chat(message, context);
    return { success: true, data: reply };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('search-symbols', async (_e, query: string) => {
  try {
    const results = await marketDataService.searchSymbols(query);
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: (error as Error).message, data: [] };
  }
});

ipcMain.handle('fetch-live-quote', async (_e, symbol: string) => {
  try {
    const quote = await marketDataService.fetchQuote(symbol);
    return { success: true, data: quote };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('save-settings', async (_e, settings: any) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const settingsPath = path.join(app.getPath('userData'), 'atlas-settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    if (settings.anthropicApiKey) {
      process.env.ANTHROPIC_API_KEY = settings.anthropicApiKey;
      ollamaService.setAnthropicKey(settings.anthropicApiKey);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const settingsPath = path.join(app.getPath('userData'), 'atlas-settings.json');
    if (!fs.existsSync(settingsPath)) return { success: true, data: {} };
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    return { success: true, data: JSON.parse(raw) };
  } catch (error) {
    return { success: false, error: (error as Error).message, data: {} };
  }
});
