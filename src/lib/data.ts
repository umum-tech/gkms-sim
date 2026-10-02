import type { Param } from "./master";

export interface Card {
  name: string;
  plan: Param | string;
  planType: string;
  category: string;
  sumRef: number;
  ev1: number;
  /** event_1 の上昇が条件付きの場合の条件名 */
  ev1c: string;
  ev2: number;
  init: number;
  par: number;
  /** 条件名 → 1回あたりの上昇量 */
  cond: Record<string, number>;
  sp: [number, number, number];
}

export interface Idol {
  name: string;
  init: number[];
  par: number[];
  par3: number[];
}

export interface Dataset {
  cards: Card[];
  idols: Idol[];
  conds: string[];
}

export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[,%％]/g, ""));
  return isFinite(n) ? n : 0;
};

export function parseCSV(t: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(f); rows.push(row); row = []; f = "";
    } else f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows;
}

/** UTF-8 を優先し、失敗したら Shift_JIS として読む（Excel 既定の CSV にも対応） */
export function decode(buf: ArrayBuffer): string {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, ""); }
  catch { return new TextDecoder("shift_jis").decode(buf); }
}

/** サポートカード一覧。ability_5 の次の列から「VoSP率+」の手前までを条件列として扱う。 */
export function parseCards(rows: string[][]): { cards: Card[]; conds: string[] } {
  const H = rows[0] ?? [];
  const ix = (n: string) => H.indexOf(n);
  if (ix("name") < 0 || ix("ability_5") < 0 || ix("VoSP率+") < 0) throw new Error("サポートカード一覧の見出しが想定と異なります");
  const c0 = ix("ability_5") + 1, c1 = ix("VoSP率+");
  const conds = H.slice(c0, c1);
  const cards = rows.slice(1).filter((r) => r[0]).map((r): Card => ({
    name: r[0],
    plan: r[ix("plan")],
    planType: r[ix("plan_type")] ?? "",
    category: r[ix("support_category")] ?? "",
    sumRef: num(r[ix("sum")]),
    ev1: num(r[ix("event_1")]),
    ev1c: r[ix("event_1_条件")] || "",
    ev2: num(r[ix("event_2")]),
    init: num(r[ix("ability_1_初期値")]),
    par: num(r[ix("ability_1_パラボ")]),
    cond: Object.fromEntries(conds.map((c, j) => [c, num(r[c0 + j])] as const).filter(([, v]) => v !== 0)),
    sp: [num(r[c1]), num(r[c1 + 1]), num(r[c1 + 2])],
  }));
  return { cards, conds };
}

/** アイドル一覧。1列目が名前・2列目が数値の行だけを拾う（見出し2行は自動で読み飛ばす）。 */
export function parseIdols(rows: string[][]): Idol[] {
  const idols = rows
    .filter((r) => r[0] && r[0] !== "-" && isFinite(parseFloat(r[1])))
    .map((r) => ({ name: r[0], init: r.slice(1, 4).map(num), par: r.slice(4, 7).map(num), par3: r.slice(7, 10).map(num) }));
  if (!idols.length) throw new Error("アイドル一覧にデータがありません");
  return idols;
}

async function fetchCSV(path: string): Promise<string[][]> {
  const res = await fetch(import.meta.env.BASE_URL + path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path} を取得できませんでした（HTTP ${res.status}）`);
  return parseCSV(decode(await res.arrayBuffer()));
}

export async function loadDataset(): Promise<Dataset> {
  const [cardRows, idolRows] = await Promise.all([fetchCSV("data/support-cards.csv"), fetchCSV("data/idols.csv")]);
  const { cards, conds } = parseCards(cardRows);
  return { cards, conds, idols: parseIdols(idolRows) };
}
