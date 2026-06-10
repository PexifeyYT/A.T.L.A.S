import { AnalysisResult } from '../types';

/**
 * Formats analysis results into human-readable ATLAS analysis report.
 * Mimics the style of an institutional-grade trading analyst.
 * Phase 8+: Will be replaced with local Ollama LLM output.
 */
export class AnalysisFormatter {
  format(result: AnalysisResult): string {
    const sig = result.primarySignal;
    const bullish = sig.direction === 'LONG';
    const bearish = sig.direction === 'SHORT';
    const neutral = sig.direction === 'NEUTRAL';

    const conviction = result.confidence.toFixed(1);
    const directionLabel = bullish ? '🟢 BULLISH' : bearish ? '🔴 BEARISH' : '⚪ NEUTRAL';
    const moduleCount = result.modulesAgreed.length;
    const totalModules = 13;

    if (neutral || result.confidence < 3) {
      return [
        `━━━ ATLAS ANALYSIS — ${result.symbol} — ${result.timeframe} ━━━`,
        '',
        `⚪ NO SETUP — WAITING FOR CONFLUENCE`,
        '',
        `Only ${moduleCount}/${totalModules} modules in agreement.`,
        `Minimum 3 required for signal publication.`,
        '',
        result.keyLevels.length > 0 ? `📌 KEY LEVELS IDENTIFIED` : '',
        ...result.keyLevels.slice(0, 5).map(l => `  ${l.label}: $${l.price.toFixed(2)}`),
        '',
        `🤖 ATLAS CONVICTION: ${conviction}/10`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ].filter(l => l !== undefined).join('\n');
    }

    const entryLow = sig.entryZone[0].toFixed(2);
    const entryHigh = sig.entryZone[1].toFixed(2);
    const t1 = sig.target1.toFixed(2);
    const t2 = sig.target2?.toFixed(2);
    const inv = sig.invalidation.toFixed(2);

    const t1PctStr = sig.target1 > 0 && sig.entryZone[0] > 0
      ? `(${(((sig.target1 - sig.entryZone[0]) / sig.entryZone[0]) * 100).toFixed(1)}%)`
      : '';

    const lines: string[] = [
      `━━━ ATLAS ANALYSIS — ${result.symbol} — ${result.timeframe} ━━━`,
      '',
      `📊 MARKET STRUCTURE`,
      this.generateStructureComment(result),
      '',
    ];

    if (result.keyLevels.length > 0) {
      lines.push(`🎯 KEY LEVELS`);
      result.keyLevels.slice(0, 6).forEach(level => {
        lines.push(`  - ${level.label}: $${level.price.toFixed(2)} (strength: ${(level.strength * 100).toFixed(0)}%)`);
      });
      lines.push('');
    }

    lines.push(
      `📈 PRIMARY SCENARIO`,
      `  Bias: ${directionLabel}`,
      `  Entry Zone: $${entryLow} – $${entryHigh}`,
      `  Target 1: $${t1} ${t1PctStr}`,
      t2 ? `  Target 2: $${t2}` : '',
      `  Invalidation: Daily close ${bullish ? 'below' : 'above'} $${inv}`,
      '',
    );

    if (result.riskFlags.length > 0) {
      lines.push(`⚠️ RISK FLAGS`);
      result.riskFlags.forEach(flag => lines.push(`  - ${flag}`));
      lines.push('');
    }

    lines.push(
      `🧠 STRATEGY CONFLUENCES (${moduleCount}/${totalModules} modules agree)`,
    );

    const allModules = [
      'mod_smc', 'mod_tjr', 'mod_wyckoff', 'mod_volume_profile',
      'mod_ma_systems', 'mod_classical_ta', 'mod_momentum', 'mod_volatility',
      'mod_intermarket', 'mod_sentiment', 'mod_seasonality', 'mod_elliott', 'mod_orderflow',
    ];

    const moduleLabels: Record<string, string> = {
      mod_smc: 'Smart Money Concepts (OB/FVG/Liquidity)',
      mod_tjr: 'TJR Strategy Constitution',
      mod_wyckoff: 'Wyckoff Method',
      mod_volume_profile: 'Volume Profile (POC/VAH/VAL)',
      mod_ma_systems: 'EMA Ribbon Alignment',
      mod_classical_ta: 'Classical Pattern Recognition',
      mod_momentum: 'RSI/MACD/Stochastic Momentum',
      mod_volatility: 'Bollinger Bands / ATR Volatility',
      mod_intermarket: 'Intermarket Analysis (DXY)',
      mod_sentiment: 'News Sentiment Analysis',
      mod_seasonality: 'Seasonal Patterns',
      mod_elliott: 'Elliott Wave Theory',
      mod_orderflow: 'Order Flow / Delta Analysis',
    };

    allModules.forEach(mod => {
      const agreed = result.modulesAgreed.includes(mod);
      lines.push(`  ${agreed ? '✅' : '❌'} ${moduleLabels[mod] || mod}`);
    });

    lines.push('');
    lines.push(`🤖 ATLAS CONVICTION: ${conviction}/10`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return lines.filter(l => l !== '').join('\n');
  }

  private generateStructureComment(result: AnalysisResult): string {
    const sig = result.primarySignal;
    const bullish = sig.direction === 'LONG';

    if (bullish) {
      return [
        `Price exhibits bullish market structure with a series of higher highs`,
        `and higher lows. Key demand zones remain intact. Smart money positioning`,
        `favors long exposure at current levels with momentum confirming.`,
      ].join(' ');
    }

    return [
      `Price exhibits bearish market structure with a series of lower highs`,
      `and lower lows. Key supply zones are holding. Smart money positioning`,
      `favors short exposure at current levels with momentum confirming weakness.`,
    ].join(' ');
  }
}
