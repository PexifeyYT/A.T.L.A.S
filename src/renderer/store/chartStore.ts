import { create } from 'zustand';

interface ChartState {
  symbol: string;
  timeframe: string;
  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: string) => void;
}

export const useChartStore = create<ChartState>((set) => ({
  symbol: 'AAPL',
  timeframe: '1D',
  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),
}));
