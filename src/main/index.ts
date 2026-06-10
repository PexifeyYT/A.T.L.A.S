import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
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

// Initialize analysis engine with strategies
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

// Register strategies (13 total)
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
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#131722',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
    title: 'ATLAS — AI Trading Analysis System',
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

app.on('ready', () => {
  // Initialize DB
  try {
    initDatabase();
    learningEngine.initializeWeights(allModuleNames, defaultWeights);
    console.log('ATLAS database initialized');
  } catch (err) {
    console.error('DB init failed:', err);
  }

  // Try to connect to local Ollama LLM
  ollamaService.init().catch(() => {});

  createWindow();

  // Schedule learning loop — check pending predictions every 30 min
  setInterval(runLearningLoop, 30 * 60 * 1000);
});

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

async function runLearningLoop() {
  try {
    const pending = getPendingPredictions();
    console.log(`Learning loop: checking ${pending.length} pending predictions`);

    for (const prediction of pending) {
      const outcome = await outcomeChecker.checkPrediction(prediction);
      saveOutcome(outcome);

      // Update module weights
      for (const moduleName of prediction.modulesAgreed) {
        const currentWeight = getModuleWeight(moduleName);
        const reward = outcome.directionCorrect ? 0.05 : -0.05;
        const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + reward));
        setModuleWeight(moduleName, newWeight);
        learningEngine.updateWeight(moduleName, outcome);
      }

      // Update asset profile
      const stats = getStats();
      upsertAssetProfile(prediction.symbol, {
        accuracy: stats.accuracy,
        totalPredictions: stats.total,
        wins: stats.wins,
        notes: '',
      });
    }
  } catch (err) {
    console.error('Learning loop error:', err);
  }
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────

ipcMain.handle('fetch-market-data', async (_event, symbol: string, timeframe: string) => {
  try {
    const data = await marketDataService.fetchOHLCV(symbol, timeframe, 200);
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle(
  'run-analysis',
  async (_event, symbol: string, timeframe: string, ohlcvData: OHLCVData) => {
    try {
      const context: MarketContext = {
        symbol,
        timestamp: Date.now(),
        macroTrend: 'UPTREND',
        volatility: 0.5,
      };

      const result = await analysisEngine.analyze(ohlcvData, context);

      // Generate LLM narrative (Ollama if available, else rule-based)
      const llmText = await ollamaService.generateAnalysis(result);
      (result as any).llmText = llmText;
      (result as any).llmModel = ollamaService.getModel() ?? 'rule-based';

      // Auto-save prediction if signal is strong enough
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },
);

ipcMain.handle('get-performance-stats', async () => {
  try {
    const stats = getStats();
    const weights = learningEngine.getAllWeights();
    return {
      success: true,
      data: {
        ...stats,
        moduleWeights: Object.fromEntries(weights),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle('get-asset-profile', async (_event, symbol: string) => {
  try {
    const profile = getAssetProfile(symbol);
    return { success: true, data: profile };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle('get-symbol-data', async (_event, symbol: string) => {
  try {
    const data = await marketDataService.fetchOHLCV(symbol, '1D', 200);
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle('get-llm-status', async () => {
  return {
    success: true,
    data: {
      available: ollamaService.isAvailable(),
      model: ollamaService.getModel(),
    },
  };
});
