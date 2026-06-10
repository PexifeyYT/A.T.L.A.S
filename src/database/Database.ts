import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { Prediction, PredictionOutcome } from '../core/types';

let db: Database.Database;

export function initDatabase(): void {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'atlas.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      direction TEXT NOT NULL,
      entry_low REAL,
      entry_high REAL,
      target1 REAL,
      target2 REAL,
      invalidation REAL,
      horizon_bars INTEGER,
      modules_agreed TEXT,
      conviction REAL,
      status TEXT DEFAULT 'PENDING',
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS outcomes (
      prediction_id TEXT PRIMARY KEY,
      direction_correct INTEGER,
      target1_hit INTEGER,
      target2_hit INTEGER,
      invalidation_hit INTEGER,
      entry_respected INTEGER,
      actual_return REAL,
      score REAL,
      scored_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (prediction_id) REFERENCES predictions(id)
    );

    CREATE TABLE IF NOT EXISTS module_weights (
      module_name TEXT PRIMARY KEY,
      weight REAL NOT NULL DEFAULT 1.0,
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS asset_profiles (
      symbol TEXT PRIMARY KEY,
      profile_version INTEGER DEFAULT 0,
      ema21_respect_rate REAL DEFAULT 0.5,
      fvg_fill_rate REAL DEFAULT 0.5,
      ob_respect_rate REAL DEFAULT 0.5,
      trend_tendency REAL DEFAULT 0.5,
      avg_daily_range_pct REAL DEFAULT 2.0,
      best_strategy TEXT,
      worst_strategy TEXT,
      best_timeframe TEXT DEFAULT '1D',
      volatility_profile TEXT DEFAULT 'MEDIUM',
      atlas_accuracy REAL DEFAULT 0.0,
      total_predictions INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      notes TEXT,
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS discovered_patterns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      module_combination TEXT,
      accuracy REAL,
      sample_count INTEGER DEFAULT 0,
      discovered_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );
  `);
}

export function savePrediction(prediction: Prediction): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO predictions
    (id, symbol, timeframe, timestamp, direction, entry_low, entry_high, target1, target2, invalidation, horizon_bars, modules_agreed, conviction, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    prediction.id,
    prediction.symbol,
    prediction.timeframe,
    prediction.timestamp,
    prediction.direction,
    prediction.entryZone[0],
    prediction.entryZone[1],
    prediction.target1,
    prediction.target2,
    prediction.invalidation,
    prediction.horizonBars,
    JSON.stringify(prediction.modulesAgreed),
    prediction.conviction,
    prediction.status,
  );
}

export function saveOutcome(outcome: PredictionOutcome): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO outcomes
    (prediction_id, direction_correct, target1_hit, target2_hit, invalidation_hit, entry_respected, actual_return, score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    outcome.predictionId,
    outcome.directionCorrect ? 1 : 0,
    outcome.target1Hit ? 1 : 0,
    outcome.target2Hit ? 1 : 0,
    outcome.invalidationHit ? 1 : 0,
    outcome.entryRespected ? 1 : 0,
    outcome.actualReturn,
    outcome.score,
  );

  // Update prediction status
  db.prepare(`UPDATE predictions SET status = ? WHERE id = ?`).run(
    outcome.target1Hit ? 'HIT' : outcome.invalidationHit ? 'INVALIDATED' : 'EXPIRED',
    outcome.predictionId,
  );
}

export function getModuleWeight(moduleName: string): number {
  const row = db.prepare('SELECT weight FROM module_weights WHERE module_name = ?').get(moduleName) as any;
  return row?.weight ?? 1.0;
}

export function setModuleWeight(moduleName: string, weight: number): void {
  db.prepare(`
    INSERT OR REPLACE INTO module_weights (module_name, weight, updated_at)
    VALUES (?, ?, ?)
  `).run(moduleName, weight, Date.now());
}

export function getAssetProfile(symbol: string): any {
  return db.prepare('SELECT * FROM asset_profiles WHERE symbol = ?').get(symbol);
}

export function upsertAssetProfile(symbol: string, data: any): void {
  const existing = getAssetProfile(symbol);
  if (existing) {
    db.prepare(`
      UPDATE asset_profiles SET
        profile_version = profile_version + 1,
        atlas_accuracy = ?,
        total_predictions = ?,
        wins = ?,
        notes = ?,
        updated_at = ?
      WHERE symbol = ?
    `).run(data.accuracy, data.totalPredictions, data.wins, data.notes, Date.now(), symbol);
  } else {
    db.prepare(`
      INSERT INTO asset_profiles (symbol, atlas_accuracy, total_predictions, wins, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(symbol, data.accuracy || 0, data.totalPredictions || 0, data.wins || 0, data.notes || '', Date.now());
  }
}

export function getStats(): any {
  const total = (db.prepare('SELECT COUNT(*) as count FROM predictions').get() as any)?.count || 0;
  const outcomes = (db.prepare('SELECT COUNT(*) as count FROM outcomes').get() as any)?.count || 0;
  const wins = (db.prepare('SELECT COUNT(*) as count FROM outcomes WHERE direction_correct = 1').get() as any)?.count || 0;
  const t1Hits = (db.prepare('SELECT COUNT(*) as count FROM outcomes WHERE target1_hit = 1').get() as any)?.count || 0;

  return {
    total,
    scored: outcomes,
    wins,
    accuracy: outcomes > 0 ? wins / outcomes : 0,
    t1HitRate: outcomes > 0 ? t1Hits / outcomes : 0,
  };
}

const TF_MS: Record<string, number> = {
  '1m': 60e3, '5m': 5*60e3, '15m': 15*60e3, '30m': 30*60e3,
  '1H': 3600e3, '2H': 2*3600e3, '4H': 4*3600e3,
  '1D': 86400e3, '1W': 7*86400e3, '1M': 30*86400e3,
};

export function getPendingPredictions(): Prediction[] {
  // Fetch all pending predictions — filter by timeframe-aware horizon below
  const rows = db.prepare(`
    SELECT * FROM predictions WHERE status = 'PENDING'
  `).all() as any[];

  const now = Date.now();
  return rows
    .filter((row) => {
      const barMs = TF_MS[row.timeframe] ?? 86400e3;
      const minAge = barMs * (row.horizon_bars ?? 12) * 0.5; // check at 50% of horizon
      return now - row.timestamp >= minAge;
    })
    .map((row) => ({
      id: row.id,
      symbol: row.symbol,
      timeframe: row.timeframe,
      timestamp: row.timestamp,
      direction: row.direction,
      entryZone: [row.entry_low, row.entry_high] as [number, number],
      target1: row.target1,
      target2: row.target2,
      invalidation: row.invalidation,
      horizonBars: row.horizon_bars,
      modulesAgreed: JSON.parse(row.modules_agreed || '[]'),
      conviction: row.conviction,
      status: row.status,
    }));
}

export function getDatabase(): Database.Database {
  return db;
}
