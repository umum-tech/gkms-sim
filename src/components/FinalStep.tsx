import type { Result } from "../lib/calc";
import type { SimState } from "../lib/master";
import { NumberInput, Panel, fmt } from "./ui";

type Update = (fn: (s: SimState) => void) => void;

export function FinalStep({ st, update, r }: { st: SimState; update: Update; r: Result }) {
  const lines: [string, string, number][] = [
    ["パラメータ合計 × 2", `${fmt(r.total)} × 2`, r.total * 2],
    ["スター性 × 7.5", `${fmt(+st.star || 0)} × 7.5`, (+st.star || 0) * 7.5],
    ["本選R1スコアの評価", `${fmt(+st.r1 || 0)} 点`, r.e1],
    ["本選R2スコアの評価", `${fmt(+st.r2 || 0)} 点`, r.e2],
    ["補正", "", -2000],
  ];
  return (
    <div className="step-grid">
      <Panel title="本選の結果" hint="本選（最終試験）で想定するスター性と各ラウンドのスコアを入力します。">
        <div className="final-fields">
          <label><span>スター性</span><NumberInput wide value={st.star} onChange={(v) => update((s) => { s.star = v; })} /></label>
          <label><span>本選 R1 スコア</span><NumberInput wide value={st.r1} step={10000} onChange={(v) => update((s) => { s.r1 = v; })} /></label>
          <label><span>本選 R2 スコア</span><NumberInput wide value={st.r2} step={10000} onChange={(v) => update((s) => { s.r2 = v; })} /></label>
        </div>
        <p className="hint">R1 は 140万点、R2 は 240万点で評価が頭打ちになります。</p>
      </Panel>

      <Panel title="評価値の内訳" hint="最終的な評価値の計算式です。">
        <table className="formula">
          <tbody>
            {lines.map(([k, d, v]) => (
              <tr key={k}><th>{k}</th><td className="d">{d}</td><td className="v">{v < 0 ? "−" : "+"}{fmt(Math.abs(v))}</td></tr>
            ))}
            <tr className="total-row"><th>評価値</th><td className="d">ランク {r.rank}</td><td className="v">{fmt(r.score)}</td></tr>
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
