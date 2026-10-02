import { useState } from "react";
import type { Result } from "../lib/calc";
import type { Dataset } from "../lib/data";
import { MEM_INIT_OPTIONS, MEM_PARA_OPTIONS, PARAMS, type SimState } from "../lib/master";
import { CardPicker } from "./CardPicker";
import { Assume, NumberInput, Panel, PlanBadge, SpRate, fmt } from "./ui";

type Update = (fn: (s: SimState) => void) => void;
type Vec = [number, number, number];

export function FormationStep({ st, update, D, r }: { st: SimState; update: Update; D: Dataset; r: Result }) {
  const [picking, setPicking] = useState<number | null>(null);
  const idol = r.idol;
  const planCount = PARAMS.map((p) => r.cards.filter((k) => k.card.plan === p).length);

  return (
    <div className="step-grid">
      <Panel title="アイドル" hint={<>プロデュースするアイドルを選びます。才能開花3以上ならチェックを入れてください。<Assume>特訓6想定</Assume></>}>
        <div className="idol-row">
          <select className="big-select" value={st.idol} onChange={(e) => update((s) => { s.idol = e.target.value; })}>
            <option value="">選択してください</option>
            {D.idols.map((i) => <option key={i.name}>{i.name}</option>)}
          </select>
          <label className="toggle">
            <input type="checkbox" checked={st.bloom} onChange={(e) => update((s) => { s.bloom = e.target.checked; })} />
            <span>才能開花 3</span>
          </label>
        </div>
        {idol && (
          <div className="stat-chips">
            {PARAMS.map((p, i) => (
              <div key={p} className={`stat-chip ${p.toLowerCase()}`}>
                <span className="k">{p}</span>
                <span className="v">{idol.init[i]}</span>
                <span className="s">パラメータボーナス {st.bloom ? idol.par3[i] : idol.par[i]}%</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="サポートカード"
        hint={<>6枚を編成します。カードをクリックすると一覧から選べます。<Assume>上限解放4・レベル上限想定</Assume></>}
        actions={<span className="plan-count">{PARAMS.map((p, i) => <PlanBadge key={p} plan={p}>{p} {planCount[i]}</PlanBadge>)}</span>}
        className="span-2"
      >
        <div className="card-slots">
          {st.cards.map((name, j) => {
            const k = r.cards.find((c) => c.slot === j);
            return (
              <button key={j} type="button" className={`card-slot ${k ? (k.card.plan as string).toLowerCase() : "empty"}`} onClick={() => setPicking(j)}>
                <span className="slot-no">{j + 1}</span>
                {k ? (
                  <>
                    <span className="slot-name">{k.card.name}</span>
                    <span className="slot-meta">
                      <PlanBadge plan={k.card.plan} />
                      <SpRate sp={k.card.sp} />
                    </span>
                    <span className="slot-sum">見込み <b>+{fmt(k.sum)}</b></span>
                  </>
                ) : (
                  <span className="slot-name muted">{name ? `「${name}」はデータにありません` : "＋ カードを選ぶ"}</span>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="メモリー" hint="4枚のメモリーについて、パラメータ初期値とパラメータボーナス(%)を選びます。">
        <div className="tbl">
          <table className="grid-table">
            <thead>
              <tr><th rowSpan={2}></th><th colSpan={3}>初期値</th><th colSpan={3}>パラメータボーナス (%)</th></tr>
              <tr>{[...PARAMS, ...PARAMS].map((p, i) => <th key={i} className={`h-${p.toLowerCase()}`}>{p}</th>)}</tr>
            </thead>
            <tbody>
              {st.mem.map((m, j) => (
                <tr key={j}>
                  <th className="row-h">{j + 1}</th>
                  {m.map((v, i) => (
                    <td key={i}>
                      <select value={v} aria-label={`メモリー${j + 1} ${i < 3 ? "初期値" : "パラメータボーナス"} ${PARAMS[i % 3]}`} onChange={(e) => update((s) => { s.mem[j][i] = e.target.value; })}>
                        {(i < 3 ? MEM_INIT_OPTIONS : MEM_PARA_OPTIONS).map((o) => <option key={o} value={o}>{o || "-"}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="HIFボーナス・SP発生率" hint="HIF固有のボーナスと、SPレッスン発生率の基本値を入力します。">
        <div className="tbl">
          <table className="grid-table">
            <thead><tr><th></th>{PARAMS.map((p) => <th key={p} className={`h-${p.toLowerCase()}`}>{p}</th>)}</tr></thead>
            <tbody>
              <tr><th className="row-h">初期値</th>{[0, 1, 2].map((i) => <td key={i}><NumberInput value={st.hif[i]} onChange={(v) => update((s) => { s.hif[i] = v; })} ariaLabel={`HIF初期値 ${PARAMS[i]}`} /></td>)}</tr>
              <tr><th className="row-h">パラメータボーナス</th>{[3, 4, 5].map((i) => <td key={i}><NumberInput value={st.hif[i]} step={0.1} suffix="%" onChange={(v) => update((s) => { s.hif[i] = v; })} ariaLabel={`HIFパラメータボーナス ${PARAMS[i - 3]}`} /></td>)}</tr>
            </tbody>
          </table>
        </div>
        <label className="inline-field">
          <span>SP発生率ベース（特訓6段階＋HIFボーナス）</span>
          <NumberInput value={st.spBase} step={0.1} suffix="%" onChange={(v) => update((s) => { s.spBase = v; })} />
        </label>
      </Panel>

      <Panel title="編成の結果（プロデュース開始時）" hint="ここまでの入力から計算した、開始時のパラメータとボーナスです。" className="span-2">
        <div className="tbl">
          <table className="grid-table summary">
            <thead>
              <tr><th></th><th colSpan={3}>パラメータ初期値</th><th colSpan={3}>パラメータボーナス</th><th colSpan={3}>SP発生率</th></tr>
              <tr><th></th>{[0, 1, 2].flatMap((g) => PARAMS.map((p) => <th key={g + p} className={`h-${p.toLowerCase()}`}>{p}</th>))}</tr>
            </thead>
            <tbody>
              {([
                ["アイドル", r.startParts.idol, r.paraParts.idol, null],
                ["サポートカード", r.startParts.cards, r.paraParts.cards, r.spParts.cards],
                ["メモリー", r.startParts.memory, r.paraParts.memory, null],
                ["HIFボーナス", r.startParts.hif, r.paraParts.hif, r.spParts.base],
              ] as [string, Vec, Vec, Vec | null][]).map(([label, a, b, c]) => (
                <tr key={label}>
                  <th className="row-h">{label}</th>
                  {a.map((x, i) => <td key={"a" + i}>{x || ""}</td>)}
                  {b.map((x, i) => <td key={"b" + i}>{x ? `${+x.toFixed(1)}%` : ""}</td>)}
                  {c ? c.map((x, i) => <td key={"c" + i}>{x ? `${+x.toFixed(1)}%` : ""}</td>) : <td colSpan={3}></td>}
                </tr>
              ))}
              <tr className="total-row">
                <th className="row-h">合計</th>
                {r.start.map((x, i) => <td key={"s" + i}>{fmt(x)}</td>)}
                {r.para.map((x, i) => <td key={"p" + i}>{(x * 100).toFixed(1)}%</td>)}
                {r.sp.map((x, i) => <td key={"sp" + i}>{x.toFixed(1)}%</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hint table-note">※ HIFボーナス行のSP発生率は「SP発生率ベース（特訓6段階＋HIFボーナス）」の入力値です。</p>
      </Panel>

      {picking !== null && (
        <CardPicker
          cards={D.cards}
          slot={picking}
          current={st.cards[picking]}
          taken={st.cards}
          onPick={(name) => update((s) => { s.cards[picking] = name; })}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
