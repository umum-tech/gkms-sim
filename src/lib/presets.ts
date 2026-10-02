import type { SimState } from "./master";

export interface Preset {
  id: string;
  name: string;
  savedAt: string;
  state: SimState;
  score: number | null;
  rank: string;
}

const KEY = "gkms-sim:presets:v1";

export function loadPresets(): Preset[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

/** 保存に失敗した場合（容量超過・プライベートモード等）は false */
export function savePresets(list: Preset[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; }
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
