import { useCallback, useEffect, useMemo, useState } from "react";
import { compute, fillCounts, normalize } from "./lib/calc";
import { loadDataset, type Dataset } from "./lib/data";
import { DEFAULT_STATE, SAMPLE_STATE, SCHED, type SimState } from "./lib/master";
import { ConditionsStep } from "./components/ConditionsStep";
import { FinalStep } from "./components/FinalStep";
import { FormationStep } from "./components/FormationStep";
import { PresetDialog } from "./components/PresetDialog";
import { ResultPanel } from "./components/ResultPanel";
import { ScheduleStep } from "./components/ScheduleStep";
import { Assume, fmt } from "./components/ui";

const STATE_KEY = "gkms-sim:state:v1";
const STEP_KEY = "gkms-sim:step";

const STEPS = [
  { id: "formation", no: "①", title: "編成", desc: "アイドル・サポカ・メモリー" },
  { id: "schedule", no: "②", title: "スケジュール", desc: "日ごとの行動" },
  { id: "conditions", no: "③", title: "達成条件", desc: "サポカの発動回数" },
  { id: "final", no: "④", title: "本選・評価値", desc: "スコアと最終評価" },
] as const;
type StepId = (typeof STEPS)[number]["id"];

function loadState(): SimState {
  try { return normalize(JSON.parse(localStorage.getItem(STATE_KEY) ?? "{}"), DEFAULT_STATE); }
  catch { return normalize({}, DEFAULT_STATE); }
}

export default function App() {
  const [D, setD] = useState<Dataset | null>(null);
  const [error, setError] = useState("");
  const [st, setSt] = useState<SimState>(loadState);
  const [step, setStep] = useState<StepId>(() => {
    const fromHash = location.hash.slice(1);
    if (STEPS.some((s) => s.id === fromHash)) return fromHash as StepId;
    try { return (localStorage.getItem(STEP_KEY) as StepId) || "formation"; } catch { return "formation"; }
  });
  const [sheet, setSheet] = useState(false);
  const [presets, setPresets] = useState(false);

  useEffect(() => { loadDataset().then(setD).catch((e: Error) => setError(e.message)); }, []);
  useEffect(() => { try { localStorage.setItem(STATE_KEY, JSON.stringify(st)); } catch { /* 保存できなくても動作は継続 */ } }, [st]);
  useEffect(() => {
    history.replaceState(null, "", `#${step}`);
    try { localStorage.setItem(STEP_KEY, step); } catch { /* 同上 */ }
  }, [step]);

  const update = useCallback((fn: (s: SimState) => void) => setSt((prev) => { const next = structuredClone(prev); fn(next); return next; }), []);
  const r = useMemo(() => (D ? compute(st, D) : null), [st, D]);

  const go = (id: StepId) => { setStep(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reset = () => {
    const ok = confirm(
      "入力を初期値に戻しますか？\n\n" +
      "・①編成（アイドル・サポカ・メモリー）、②スケジュール、③達成条件は未選択に戻ります\n" +
      "・HIFボーナス、SP発生率ベース、④本選・評価値は初期値に戻ります\n" +
      "・保存した編成は消えません",
    );
    if (ok) setSt(normalize({}, DEFAULT_STATE));
  };
  const loadSample = () => { if (D) setSt(normalize(fillCounts(SAMPLE_STATE, D.conds), DEFAULT_STATE)); };

  // ステップごとの「まだ入力が必要そうな箇所」
  const todo: Record<StepId, number> = {
    formation: (st.idol ? 0 : 1) + (r ? 6 - r.cards.length : 0),
    schedule: SCHED.filter((s, j) => s[2].length > 1 && !st.sched[j]).length
      + st.lessons.filter((l) => !l.m).length + st.classes.filter((v) => !v).length + st.exams.filter((v) => !v).length,
    conditions: D && r ? D.conds.filter((c) => r.usedBy[c].length && !r.isAuto[c] && (st.counts[c] ?? "") === "").length : 0,
    final: 0,
  };
  const idx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="logo">HIF</span>
            <div>
              <h1>学マス プロデュースシミュレーター <Assume>HIF編想定</Assume></h1>
              <p>編成とスケジュールを組み立てて、最終評価値を試算します</p>
            </div>
          </div>
          <div className="top-actions">
            {D && <span className="data-status">データ: サポカ {D.cards.length}枚 / アイドル {D.idols.length}人</span>}
            <button type="button" className="ghost-btn" onClick={() => setPresets(true)} disabled={!D}>保存・呼び出し</button>
            <button type="button" className="ghost-btn" onClick={reset}>初期値に戻す</button>
          </div>
        </div>
        <nav className="steps" aria-label="入力ステップ">
          {STEPS.map((s) => (
            <button key={s.id} type="button" className={`step ${step === s.id ? "on" : ""}`} aria-current={step === s.id ? "step" : undefined} onClick={() => go(s.id)}>
              <span className="step-no">{s.no}</span>
              <span className="step-t">{s.title}<small>{s.desc}</small></span>
              {todo[s.id] > 0 && <span className="todo" title="未入力の項目">{todo[s.id]}</span>}
            </button>
          ))}
        </nav>
      </header>

      <div className="layout">
        <main className="content">
          {error && <div className="callout error"><b>データを読み込めませんでした。</b>{error}</div>}
          {!D && !error && <div className="loading">データを読み込んでいます…</div>}
          {D && r && (
            <>
              {step === "formation" && <FormationStep st={st} update={update} D={D} r={r} />}
              {step === "schedule" && <ScheduleStep st={st} update={update} r={r} goFinal={() => go("final")} />}
              {step === "conditions" && <ConditionsStep st={st} update={update} D={D} r={r} />}
              {step === "final" && <FinalStep st={st} update={update} r={r} />}
              <div className="pager">
                {idx > 0 ? <button type="button" className="ghost-btn" onClick={() => go(STEPS[idx - 1].id)}>← {STEPS[idx - 1].no} {STEPS[idx - 1].title}</button> : <span />}
                {idx < STEPS.length - 1 && <button type="button" className="primary-btn" onClick={() => go(STEPS[idx + 1].id)}>次へ：{STEPS[idx + 1].no} {STEPS[idx + 1].title} →</button>}
              </div>
            </>
          )}
        </main>

        {r && (
          <aside className={`side ${sheet ? "open" : ""}`}>
            <div className="side-inner">
              <div className="side-title">
                <h2>試算結果</h2>
                <button type="button" className="icon-btn sheet-close" aria-label="閉じる" onClick={() => setSheet(false)}>✕</button>
              </div>
              <ResultPanel r={r} />
            </div>
          </aside>
        )}
      </div>

      {r && (
        <button type="button" className="mobile-bar" onClick={() => setSheet(true)}>
          <span className="mb-rank">{r.rank}</span>
          <span className="mb-score">評価値 <b>{fmt(r.score)}</b></span>
          <span className="mb-open">内訳 ▲</span>
        </button>
      )}
      {sheet && <div className="backdrop" onClick={() => setSheet(false)} />}
      {presets && (
        <PresetDialog
          st={st}
          r={r}
          onLoad={(s) => setSt(normalize(s, DEFAULT_STATE))}
          onLoadSample={loadSample}
          onClose={() => setPresets(false)}
        />
      )}
    </div>
  );
}
