import { create } from "zustand";
import type {
  ScanTimesheetResponse,
  MenuInfo,
  SwimmerResult,
  SwimStroke,
} from "@swimhub-scanner/shared";

interface ScanResultStore {
  menu: MenuInfo | null;
  swimmers: SwimmerResult[];
  setResult: (response: ScanTimesheetResponse) => void;
  updateSwimmerName: (no: number, name: string) => void;
  updateSwimmerStyle: (no: number, style: SwimStroke) => void;
  updateTime: (no: number, index: number, time: number | null) => void;
  addSwimmer: () => void;
  removeSwimmer: (no: number) => void;
  reset: () => void;
}

export const useScanResultStore = create<ScanResultStore>((set) => ({
  menu: null,
  swimmers: [],

  setResult: (response) =>
    set({
      menu: response.menu,
      swimmers: response.swimmers,
    }),

  updateSwimmerName: (no, name) =>
    set((state) => ({
      swimmers: state.swimmers.map((s) => (s.no === no ? { ...s, name } : s)),
    })),

  updateSwimmerStyle: (no, style) =>
    set((state) => ({
      swimmers: state.swimmers.map((s) => (s.no === no ? { ...s, style } : s)),
    })),

  updateTime: (no, index, time) =>
    set((state) => ({
      swimmers: state.swimmers.map((s) => {
        if (s.no !== no) return s;
        const newTimes = [...s.times];
        newTimes[index] = time;
        return { ...s, times: newTimes };
      }),
    })),

  addSwimmer: () =>
    set((state) => {
      const maxNo = state.swimmers.reduce((max, s) => Math.max(max, s.no), 0);
      const timeLength = state.swimmers[0]?.times.length ?? 0;
      const newSwimmer: SwimmerResult = {
        no: maxNo + 1,
        name: "",
        style: "Fr",
        times: Array(timeLength).fill(null) as (number | null)[],
      };
      return { swimmers: [...state.swimmers, newSwimmer] };
    }),

  removeSwimmer: (no) =>
    set((state) => ({
      swimmers: state.swimmers.filter((s) => s.no !== no).map((s, i) => ({ ...s, no: i + 1 })),
    })),

  reset: () => set({ menu: null, swimmers: [] }),
}));
