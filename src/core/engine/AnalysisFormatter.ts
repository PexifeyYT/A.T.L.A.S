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
        ...(result.keyLevels.length > 0 ? [
          '',
          `📌 KEY LEVELS IDENTIFIED`,
          ...result.keyLevels.slice(0, 5).map(l => `  ${l.label}: $${l.price.toFixed(2)}`),
        ] : []),
        '',
        `🤖 ATLAS CONVICTION: ${conviction}/10`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ].join('\n');
    }

    const entryLow = sig.entryZone[0].toFixed(2);
    const entryHigh = sig.entryZone[1].toFixed(2);
    const t1 = sig.target1.toFixed(2);
    const t2 = sig.target2?.toFixed(2);
    const inv = sig.invalidation.toFixed(2);

    const entryRef = bullish ? sig.entryZone[0] : sig.entryZone[1];
    const t1PctStr = sig.target1 > 0 && entryRef > 0
      ? `(${(((sig.target1 - entryRef) / entryRef) * 100).toFixed(1)}%)`
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
    );
    if (t2) lines.push(`  Target 2: $${t2}`);
    lines.push(
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

    return lines.join('\n');
  }

  private generateStructureComment(result: AnalysisResult): string {
    const sig = result.primarySignal;
    const bullish = sig.direction === 'LONG';
    const moduleCount = result.modulesAgreed.length;

    const confidencePct = (sig.confidence * 100).toFixed(0);
    const hasSMC = result.modulesAgreed.includes('mod_smc');
    const hasTJR = result.modulesAgreed.includes('mod_tjr');
    const hasVol = result.modulesAgreed.includes('mod_volume_profile');
    const hasMomentum = result.modulesAgreed.includes('mod_momentum');
    const hasWyckoff = result.modulesAgreed.includes('mod_wyckoff');

    const confWord = sig.confidence > 0.75 ? 'high-conviction' : sig.confidence > 0.60 ? 'moderate' : 'low-conviction';
    const moduleWord = moduleCount >= 8 ? 'strong multi-module' : moduleCount >= 5 ? 'solid' : 'emerging';

    const bullets: string[] = [];

    // Primary explanation from the top module
    if (sig.explanation && sig.explanation !== 'No clear directional confluence across modules') {
      bullets.push(sig.explanation);
    }

    if (hasSMC && hasTJR) {
      bullets.push(`Both SMC structure and TJR institutional framework aligned ${bullish ? 'bullish' : 'bearish'} — highest-weight confirmation`);
    } else if (hasSMC) {
      bullets.push(`Smart money structure ${bullish ? 'broken above key swing high (BOS)' : 'broke below key swing low (CHoCH)'} — institutional footprint visible`);
    } else if (hasTJR) {
      bullets.push(`TJR setup: HTF bias ${bullish ? 'uptrend' : 'downtrend'} with LTF ${bullish ? 'BOS' : 'CHoCH'} entry trigger confirmed`);
    }

    if (hasWyckoff) {
      bullets.push(`Wyckoff ${bullish ? 'spring detected — accumulation phase complete, composite man repositioning long' : 'UTAD detected — distribution complete, weakness ahead'}`);
    }

    if (hasVol) {
      const poc = result.keyLevels.find(l => l.label?.startsWith('POC'));
      bullets.push(`Volume profile: price ${bullish ? 'reclaimed' : 'rejected'} POC${poc ? ` at $${poc.price.toFixed(2)}` : ''} — ${bullish ? 'bullish magnet above' : 'bearish gravity pulling lower'}`);
    }

    if (hasMomentum) {
      bullets.push(`Momentum oscillators ${bullish ? '(RSI/MACD) oversold bounce or bullish crossover triggered' : '(RSI/MACD) overbought rejection or bearish crossover confirmed'}`);
    }

    const intro = `${moduleWord.charAt(0).toUpperCase() + moduleWord.slice(1)} ${confWord} ${bullish ? 'LONG' : 'SHORT'} setup — ${confidencePct}% module confidence (${moduleCount}/${13} modules aligned).`;

    return intro + '\n\n' + bullets.map(b => `  • ${b}`).join('\n');
  }
}
