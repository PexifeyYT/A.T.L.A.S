import axios from 'axios';
import { AnalysisResult } from '../types';
import { AnalysisFormatter } from '../engine/AnalysisFormatter';

const OLLAMA_BASE = 'http://localhost:11434';
const PREFERRED_MODELS = ['llama3', 'mistral', 'phi3', 'gemma'];

export class OllamaService {
  private formatter = new AnalysisFormatter();
  private available = false;
  private model: string | null = null;

  async init(): Promise<void> {
    try {
      const resp = await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 2000 });
      const models: string[] = (resp.data.models ?? []).map((m: any) => m.name as string);

      for (const preferred of PREFERRED_MODELS) {
        const found = models.find(m => m.toLowerCase().startsWith(preferred));
        if (found) {
          this.model = found;
          break;
        }
      }

      if (!this.model && models.length > 0) {
        this.model = models[0];
      }

      this.available = !!this.model;
      if (this.available) {
        console.log(`ATLAS LLM: Ollama connected — using ${this.model}`);
      }
    } catch {
      console.log('ATLAS LLM: Ollama not available — using rule-based formatter');
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  getModel(): string | null {
    return this.model;
  }

  async generateAnalysis(result: AnalysisResult): Promise<string> {
    if (!this.available || !this.model) {
      return this.formatter.format(result);
    }

    try {
      const prompt = this.buildPrompt(result);
      const resp = await axios.post(
        `${OLLAMA_BASE}/api/generate`,
        {
          model: this.model,
          prompt,
          stream: false,
          options: { temperature: 0.3, top_p: 0.9, num_predict: 512 },
        },
        { timeout: 30000 },
      );

      const text: string = resp.data.response ?? '';
      return text.trim() || this.formatter.format(result);
    } catch (err) {
      console.warn('Ollama generation failed, using fallback:', err);
      return this.formatter.format(result);
    }
  }

  async *generateAnalysisStream(result: AnalysisResult): AsyncGenerator<string> {
    if (!this.available || !this.model) {
      yield this.formatter.format(result);
      return;
    }

    try {
      const prompt = this.buildPrompt(result);
      const resp = await axios.post(
        `${OLLAMA_BASE}/api/generate`,
        { model: this.model, prompt, stream: true, options: { temperature: 0.3, num_predict: 512 } },
        { responseType: 'stream', timeout: 30000 },
      );

      for await (const chunk of resp.data) {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) yield parsed.response as string;
            if (parsed.done) return;
          } catch {
            // incomplete JSON chunk — skip
          }
        }
      }
    } catch {
      yield this.formatter.format(result);
    }
  }

  private buildPrompt(result: AnalysisResult): string {
    const sig = result.primarySignal;
    const modules = result.modulesAgreed.join(', ');
    const keyLevels = result.keyLevels
      .slice(0, 5)
      .map(l => `${l.label}: $${l.price.toFixed(2)}`)
      .join(', ');

    return `You are ATLAS, an institutional-grade AI trading analyst. Produce a concise, professional trading analysis.

SYMBOL: ${result.symbol} | TIMEFRAME: ${result.timeframe}
DIRECTION: ${sig.direction} | CONVICTION: ${result.confidence.toFixed(1)}/10
ENTRY ZONE: $${sig.entryZone[0].toFixed(2)} – $${sig.entryZone[1].toFixed(2)}
TARGET 1: $${sig.target1.toFixed(2)} | TARGET 2: $${(sig.target2 ?? 0).toFixed(2)}
INVALIDATION: $${sig.invalidation.toFixed(2)}
KEY LEVELS: ${keyLevels}
MODULES AGREED (${result.modulesAgreed.length}/13): ${modules}
RISK FLAGS: ${result.riskFlags.join(', ') || 'None'}

Write a 3-paragraph analysis: (1) market structure and context, (2) trade setup rationale, (3) risk management. Be direct and professional. No fluff.`;
  }
}
