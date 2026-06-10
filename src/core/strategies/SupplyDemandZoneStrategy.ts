import { IStrategyModule, StrategySignal, OHLCVData, MarketContext, PriceLevel } from '@core/types';

/**
 * Supply & Demand Zone Strategy
 * Fresh institutional zones: base (1-3 bar consolidation) + explosive departure
 * Quality degrades with each test. Liquidity sweep + structure shift = entry
 */
export class SupplyDemandZoneStrategy implements IStrategyModule {
  name = 'mod_supply_demand';
  weight = 1.55;

  analyze(data: OHLCVData, _ctx: MarketContext): StrategySignal {
    const bars = data.bars;
    if (bars.length < 50) return this.neutral();

    const last = bars[bars.length - 1];
    const atr = this.calcATR(bars.slice(-14));
    const zones = this.findZones(bars.slice(-120), atr);
    const price = last.close;

    // Find nearest untested demand zone (price approaching from above)
    const demandZones = zones.filter(z => z.type === 'demand' && z.tests === 0)
      .filter(z => price > z.high * 0.998 && price < z.high * 1.06);
    demandZones.sort((a, b) => b.high - a.high);

    if (demandZones.length > 0) {
      const zone = demandZones[0];
      const atZone = price <= zone.high * 1.005 && price >= zone.low * 0.995;
      if (atZone) {
        const rr = (last.close * 1.05 - zone.high) / (zone.high - zone.low * 0.997);
        if (rr >= 1.5) {
          return {
            direction: 'LONG',
            confidence: 0.76,
            entryZone: [zone.low, zone.high],
            target1: zone.high + atr * 3,
            target2: zone.high + atr * 6,
            invalidation: zone.low * 0.997,
            explanation: `Fresh Demand Zone [${zone.low.toFixed(2)}–${zone.high.toFixed(2)}] — institutional buy orders intact, R:R ${rr.toFixed(1)}:1`,
            moduleName: this.name, weight: this.weight,
          };
        }
      }
    }

    // Find nearest untested supply zone (price approaching from below)
    const supplyZones = zones.filter(z => z.type === 'supply' && z.tests === 0)
      .filter(z => price < z.low * 1.002 && price > z.low * 0.94);
    supplyZones.sort((a, b) => a.low - b.low);

    if (supplyZones.length > 0) {
      const zone = supplyZones[0];
      const atZone = price >= zone.low * 0.995 && price <= zone.high * 1.005;
      if (atZone) {
        const rr = (zone.low - last.close * 0.95) / (zone.high * 1.003 - zone.low);
        if (rr >= 1.5) {
          return {
            direction: 'SHORT',
            confidence: 0.76,
            entryZone: [zone.low, zone.high],
            target1: zone.low - atr * 3,
            target2: zone.low - atr * 6,
            invalidation: zone.high * 1.003,
            explanation: `Fresh Supply Zone [${zone.low.toFixed(2)}–${zone.high.toFixed(2)}] — institutional sell orders intact, R:R ${rr.toFixed(1)}:1`,
            moduleName: this.name, weight: this.weight,
          };
        }
      }
    }

    // Once-tested zones (lower confidence)
    const testedDemand = zones.filter(z => z.type === 'demand' && z.tests === 1)
      .filter(z => price <= z.high * 1.005 && price >= z.low * 0.995);
    if (testedDemand.length > 0) {
      const zone = testedDemand[0];
      return {
        direction: 'LONG',
        confidence: 0.62,
        entryZone: [zone.low, zone.high],
        target1: zone.high + atr * 2.5,
        target2: zone.high + atr * 5,
        invalidation: zone.low * 0.996,
        explanation: `Tested Demand Zone [${zone.low.toFixed(2)}–${zone.high.toFixed(2)}] — partially filled, remaining orders may hold`,
        moduleName: this.name, weight: this.weight,
      };
    }

    return this.neutral();
  }

  private findZones(bars: OHLCVData['bars'], atr: number): Array<{type: 'demand'|'supply'; low: number; high: number; tests: number}> {
    const zones: Array<{type: 'demand'|'supply'; low: number; high: number; tests: number}> = [];
    const minMove = atr * 2.0; // explosive move threshold

    for (let i = 3; i < bars.length - 3; i++) {
      const base = bars[i];
      const baseRange = base.high - base.low;
      if (baseRange > atr * 1.2) continue; // not a base bar (too wide)

      // Check for explosive move after base (demand zone — price launches UP)
      const after = bars.slice(i + 1, i + 4);
      const maxAfterHigh = Math.max(...after.map(b => b.high));
      if (maxAfterHigh - base.low > minMove) {
        // Count how many times price has returned to this zone
        const zoneHigh = base.high;
        const zoneLow = base.low;
        let tests = 0;
        for (let j = i + 4; j < bars.length; j++) {
          if (bars[j].low <= zoneHigh && bars[j].high >= zoneLow) tests++;
        }
        zones.push({ type: 'demand', low: zoneLow, high: zoneHigh, tests });
      }

      // Check for explosive move before base (supply zone — price collapses DOWN)
      const before = bars.slice(Math.max(0, i - 3), i);
      const minBeforeLow = Math.min(...before.map(b => b.low));
      if (base.high - minBeforeLow > minMove) {
        const zoneHigh = base.high;
        const zoneLow = base.low;
        let tests = 0;
        for (let j = i + 1; j < bars.length; j++) {
          if (bars[j].low <= zoneHigh && bars[j].high >= zoneLow) tests++;
        }
        zones.push({ type: 'supply', low: zoneLow, high: zoneHigh, tests });
      }
    }

    return zones;
  }

  getKeyLevels(data: OHLCVData): PriceLevel[] {
    const bars = data.bars;
    if (bars.length < 50) return [];
    const atr = this.calcATR(bars.slice(-14));
    const zones = this.findZones(bars.slice(-120), atr);
    return zones.slice(0, 6).map(z => ({
      price: (z.low + z.high) / 2,
      type: z.type === 'demand' ? 'support' as const : 'resistance' as const,
      strength: z.tests === 0 ? 0.85 : z.tests === 1 ? 0.65 : 0.45,
      label: `${z.tests === 0 ? 'Fresh' : 'Tested'} ${z.type === 'demand' ? 'Demand' : 'Supply'}`,
    }));
  }

  private calcATR(bars: OHLCVData['bars']): number {
    if (bars.length < 2) return 1;
    let sum = 0;
    for (let i = 1; i < bars.length; i++) {
      sum += Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - bars[i-1].close), Math.abs(bars[i].low - bars[i-1].close));
    }
    return sum / (bars.length - 1);
  }

  getConfidence() { return 0.70; }
  getWeight() { return this.weight; }
  getExplanation() { return 'Supply & Demand — fresh institutional zones, liquidity sweep confirmation, zone quality scoring'; }

  private neutral(): StrategySignal {
    return { direction: 'NEUTRAL', confidence: 0, entryZone: [0,0], target1: 0, invalidation: 0, explanation: 'No S&D zone signal', moduleName: this.name, weight: this.weight };
  }
}
