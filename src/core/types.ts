// Market data types
export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OHLCVData {
  symbol: string;
  timeframe: string;
  bars: OHLCV[];
}

// Strategy module interface
export interface StrategySignal {
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number; // 0-1
  entryZone: [number, number];
  target1: number;
  target2?: number;
  invalidation: number;
  explanation: string;
  moduleName: string;
  weight: number;
}

export interface IStrategyModule {
  name: string;
  analyze(data: OHLCVData, context: MarketContext): StrategySignal;
  getKeyLevels(data: OHLCVData): PriceLevel[];
  getConfidence(): number;
  getWeight(): number;
  getExplanation(): string;
}

export interface PriceLevel {
  price: number;
  type: 'support' | 'resistance' | 'orderblock' | 'fvg' | 'liquidity';
  strength: number;
  label: string;
}

export interface MarketContext {
  symbol: string;
  timestamp: number;
  macroTrend: 'UPTREND' | 'DOWNTREND' | 'RANGING';
  volatility: number;
  newssentiment?: number;
}

export interface PredictionCandle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

// Analysis result
export interface AnalysisResult {
  symbol: string;
  timeframe: string;
  timestamp: number;
  primarySignal: StrategySignal;
  confidence: number; // 0-10
  modulesAgreed: string[];
  keyLevels: PriceLevel[];
  riskFlags: string[];
  predictionId?: string;
  prediction: {
    scenario1: { direction: string; probability: number; target1: number; target2: number };
  };
  predictionCandles?: PredictionCandle[];
  lastRealBarTime?: number; // unix seconds — boundary between real and predicted
  moduleVotes?: Record<string, { direction: string; confidence: number; agrees: boolean }>;
}

// Prediction tracking
export interface Prediction {
  id: string;
  symbol: string;
  timeframe: string;
  timestamp: number;
  direction: 'LONG' | 'SHORT';
  entryZone: [number, number];
  target1: number;
  target2: number;
  invalidation: number;
  horizonBars: number;
  modulesAgreed: string[];
  conviction: number;
  status: 'PENDING' | 'HIT' | 'INVALIDATED' | 'EXPIRED';
}

export interface PredictionOutcome {
  predictionId: string;
  directionCorrect: boolean;
  target1Hit: boolean;
  target2Hit: boolean;
  invalidationHit: boolean;
  entryRespected: boolean;
  actualReturn: number;
  score: number; // -3 to +11
}
