// 評価値の計算。式は旧版（hif-hyoka.html の compute）と同一で、画面表示用の内訳を追加で返す。
import { num, type Card, type Dataset, type Idol } from "./data";
import { CLASS, DEF_COUNTS, EXAM, LESSON, PARAMS, PARAM_MAX, R1, R2, RANK, SCHED, type SimState } from "./master";

type Vec = [number, number, number];
const fl = (x: number) => Math.floor(x + 1e-9);
const vec = (f: (i: number) => number): Vec => [f(0), f(1), f(2)];
const sumRows = (rows: number[][]): Vec => vec((i) => rows.reduce((a, r) => a + r[i], 0));

function roundEval(score: number, R: { th: number[]; rate: number[] }): number {
  let x = 0;
  for (let i = 0; i < R.rate.length; i++) {
    const lo = R.th[i], hi = R.th[i + 1];
    if (score > lo) x += R.rate[i] * (Math.min(score, hi) - lo);
  }
  return Math.floor(Math.round(x * 1e6) / 1e6);
}

/** スケジュールから自動で数えられる条件。該当しなければ null（手入力）。 */
export function autoCount(name: string, st: SimState): number | null {
  const L = st.lessons.map((l) => l.m), K = st.sched;
  const cL = (v: string) => L.filter((x) => x === v).length, cK = (v: string) => K.filter((x) => x === v).length;
  let m = name.match(/^(Vo|Da|Vi)SP終了時$/); if (m) return cL(m[1] + "SP");
  m = name.match(/^(Vo|Da|Vi)レス終了時$/); if (m) return cL(m[1]) + cL(m[1] + "SP");
  m = name.match(/^(Vo|Da|Vi)通常終了時$/); if (m) return cL(m[1]);
  const A: Record<string, [string, number?]> = {
    "活動支給差し入れ選択時": ["差し入れ"], "授業営業終了時": ["授業"], "お出かけ終了時": ["おでかけ"], "相談選択時": ["相談"],
    "休む選択時": ["休む"], "試験・オデ終了時（2回のみ）": ["試験", 2], "特別指導開始時（3回のみ）": ["特別指導", 3],
    "活動支給差し入れ選択時（2回のみ）": ["差し入れ", 2], "相談選択時（2回のみ）": ["相談", 2], "お出かけ終了時（2回のみ）": ["おでかけ", 2],
  };
  const a = A[name];
  if (a) return a[1] ? Math.min(cK(a[0]), a[1]) : cK(a[0]);
  return null;
}

/** 手入力条件の目安回数: 旧版の既定値 → 「（n回のみ）」の n → 10 */
export function defaultCount(name: string): number {
  if (name in DEF_COUNTS) return DEF_COUNTS[name];
  const m = name.match(/（(\d+)回のみ）/);
  return m ? +m[1] : 10;
}

export interface CardPart { cond: string; per: number; count: number; value: number }
export interface CardResult { card: Card; slot: number; fixed: number; parts: CardPart[]; sum: number }

export interface Result {
  idol: Idol | undefined;
  counts: Record<string, number>;
  isAuto: Record<string, boolean>;
  /** 条件名 → その条件で上昇するカード */
  usedBy: Record<string, string[]>;
  cards: CardResult[];
  startParts: { idol: Vec; cards: Vec; memory: Vec; hif: Vec };
  start: Vec;
  paraParts: { idol: Vec; cards: Vec; memory: Vec; hif: Vec };
  para: Vec;
  cardGain: Vec;
  spParts: { base: Vec; cards: Vec };
  sp: Vec;
  lesson: Vec[];
  cls: Vec[];
  exam: Vec[];
  totals: { lesson: Vec; cls: Vec; exam: Vec };
  /** 上限適用前のパラメータ */
  rawParam: Vec;
  /** 上限で切り捨てられた分 */
  overflow: Vec;
  /** 上限（PARAM_MAX）適用後のパラメータ */
  param: Vec;
  total: number;
  e1: number;
  e2: number;
  score: number;
  rank: string;
  next: { rank: string; need: number } | null;
}

export function compute(st: SimState, D: Dataset): Result {
  const idol = D.idols.find((i) => i.name === st.idol);
  const iv = idol ?? { init: [0, 0, 0], par: [0, 0, 0], par3: [0, 0, 0] };
  const picked = st.cards.map((n, slot) => ({ card: D.cards.find((c) => c.name === n), slot })).filter((x): x is { card: Card; slot: number } => !!x.card);

  const counts: Record<string, number> = {}, isAuto: Record<string, boolean> = {}, usedBy: Record<string, string[]> = {};
  for (const c of D.conds) {
    const a = autoCount(c, st);
    isAuto[c] = a !== null;
    counts[c] = a ?? num(st.counts[c] ?? "");
    usedBy[c] = picked.filter(({ card }) => (card.cond[c] ?? 0) > 0 || card.ev1c === c).map(({ card }) => card.name);
  }

  const cards: CardResult[] = picked.map(({ card, slot }) => {
    const parts: CardPart[] = [];
    for (const c of D.conds) {
      const per = card.cond[c] ?? 0;
      if (per) parts.push({ cond: c, per, count: counts[c], value: per * counts[c] });
    }
    let fixed = card.ev2;
    if (card.ev1c) {
      const count = counts[card.ev1c] ?? 0;
      parts.push({ cond: card.ev1c, per: card.ev1, count, value: card.ev1 * count });
    } else fixed += card.ev1;
    return { card, slot, fixed, parts, sum: fixed + parts.reduce((a, p) => a + p.value, 0) };
  });

  const ofPlan = (i: number) => picked.filter(({ card }) => card.plan === PARAMS[i]).map(({ card }) => card);
  const startParts = {
    idol: vec((i) => iv.init[i]),
    cards: vec((i) => ofPlan(i).reduce((a, k) => a + k.init, 0)),
    memory: vec((i) => st.mem.reduce((a, m) => a + num(m[i]), 0)),
    hif: vec((i) => num(st.hif[i])),
  };
  const paraParts = {
    idol: vec((i) => (st.bloom ? iv.par3[i] : iv.par[i])),
    cards: vec((i) => ofPlan(i).reduce((a, k) => a + k.par, 0)),
    memory: vec((i) => st.mem.reduce((a, m) => a + num(m[3 + i]), 0)),
    hif: vec((i) => num(st.hif[3 + i])),
  };
  const start = vec((i) => startParts.idol[i] + startParts.cards[i] + startParts.memory[i] + startParts.hif[i]);
  const para = vec((i) => (paraParts.idol[i] + paraParts.cards[i] + paraParts.memory[i] + paraParts.hif[i]) / 100);
  const cardGain = vec((i) => cards.filter((k) => k.card.plan === PARAMS[i]).reduce((a, k) => a + k.sum, 0));
  const spParts = { base: vec(() => num(st.spBase)), cards: vec((i) => picked.reduce((a, { card }) => a + card.sp[i], 0)) };
  const sp = vec((i) => spParts.base[i] + spParts.cards[i]);

  const lesson = LESSON.map((l, j): Vec => {
    const { m: h, s } = st.lessons[j], isSP = /SP$/.test(h);
    return vec((i) => {
      const t = PARAMS[i];
      return fl(((h === t ? l[2] : 0) + (h === t + "SP" ? l[4] : 0) + (s === t ? (isSP ? l[5] : l[3]) : 0)) * (1 + para[i]));
    });
  });
  const cls = CLASS.map((c, j): Vec => vec((i) => (st.classes[j] === PARAMS[i] ? c[2] : 0)));
  const exam = EXAM.map((e, j): Vec => vec((i) => {
    const x = e[1] + (st.exams[j] === PARAMS[i] ? e[2] : 0);
    return x + fl(x * para[i]);
  }));
  const totals = { lesson: sumRows(lesson), cls: sumRows(cls), exam: sumRows(exam) };
  const rawParam = vec((i) => start[i] + cardGain[i] + totals.lesson[i] + totals.cls[i] + totals.exam[i]);
  // 上昇量はすべて0以上なので、最後にまとめて上限を適用しても途中で頭打ちにした場合と結果は同じ
  const param = vec((i) => Math.min(rawParam[i], PARAM_MAX));
  const overflow = vec((i) => rawParam[i] - param[i]);
  const total = param[0] + param[1] + param[2];
  const e1 = roundEval(num(st.r1), R1), e2 = roundEval(num(st.r2), R2);
  const score = total * 2 + num(st.star) * 7.5 + e1 + e2 - 2000;
  const rank = RANK.filter(([s]) => score >= s).pop()?.[1] ?? "";
  const nx = RANK.find(([s]) => s > score);

  return {
    idol, counts, isAuto, usedBy, cards, startParts, start, paraParts, para, cardGain, spParts, sp,
    lesson, cls, exam, totals, rawParam, overflow, param, total, e1, e2, score, rank,
    next: nx ? { rank: nx[1], need: nx[0] - score } : null,
  };
}

/** 手入力条件のうち未入力のものに目安回数を入れる */
export function fillCounts(st: SimState, conds: string[]): SimState {
  const counts = { ...st.counts };
  for (const c of conds) if ((counts[c] ?? "") === "") counts[c] = String(defaultCount(c));
  return { ...st, counts };
}

/** 保存データを現在の形式に揃える（欠けた項目は既定値、固定日の行動は自動設定） */
export function normalize(raw: Partial<SimState>, def: SimState): SimState {
  const st: SimState = { ...structuredClone(def), ...structuredClone(raw) };
  // 旧形式の「-」（なし）は未選択として扱う
  st.lessons = st.lessons.map((l) => ({ m: l.m === "-" ? "" : l.m, s: l.s || "-" }));
  st.classes = st.classes.map((v) => (v === "-" ? "" : v));
  st.exams = st.exams.map((v) => (v === "-" ? "" : v));
  st.sched = SCHED.map((s, j) => (s[2].length === 1 ? s[2][0] : s[2].includes(st.sched[j] as never) ? st.sched[j] : ""));
  return st;
}
