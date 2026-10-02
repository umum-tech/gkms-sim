import type { Result } from "../lib/calc";
import { defaultCount } from "../lib/calc";
import type { Dataset } from "../lib/data";
import type { SimState } from "../lib/master";
import { NumberInput, Panel, PlanBadge, fmt } from "./ui";

const isBlank = (v: string | undefined) => (v ?? "") === "";

type Update = (fn: (s: SimState) => void) => void;

export function ConditionsStep({ st, update, D, r }: { st: SimState; update: Update; D: Dataset; r: Result }) {
  const used = D.conds.filter((c) => r.usedBy[c].length);
  const unused = D.conds.filter((c) => !r.usedBy[c].length);
  const manualUsed = used.filter((c) => !r.isAuto[c]);
  const blankUsed = manualUsed.filter((c) => isBlank(st.counts[c]));
  const fillAll = () => update((s) => { for (const c of blankUsed) s.counts[c] = String(defaultCount(c)); });

  const row = (c: string) => {
    const auto = r.isAuto[c];
    const guide = defaultCount(c);
    const blank = !auto && isBlank(st.counts[c]);
    const changed = !auto && !blank && +st.counts[c] !== guide;
    return (
      <li key={c} className={`cond ${auto ? "auto" : "manual"} ${blank && r.usedBy[c].length ? "pending" : ""}`}>
        <div className="cond-name">
          {c}
          {r.usedBy[c].length > 0 && <span className="cond-cards">{r.usedBy[c].join(" / ")}</span>}
        </div>
        <span className={`tag ${auto ? "tag-auto" : "tag-manual"}`}>{auto ? "スケジュールから自動" : "手入力"}</span>
        <div className="cond-val">
          <NumberInput
            value={auto ? r.counts[c] : (st.counts[c] ?? "")}
            placeholder={auto ? undefined : `目安 ${guide}`}
            readOnly={auto}
            suffix="回"
            ariaLabel={c}
            onChange={(v) => update((s) => { s.counts[c] = v; })}
          />
          {(blank || changed) && (
            <button type="button" className="link-btn sm" onClick={() => update((s) => { s.counts[c] = String(guide); })}>
              {blank ? `目安（${guide}回）を入れる` : `目安（${guide}回）に戻す`}
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="step-grid">
      <div className="callout span-2">
        <b>サポートカードの「〜時にパラメータ上昇」が何回発生するかを見積もります。</b>
        編成中のカードに関係する条件だけを表示しています。
        「スケジュールから自動」の回数は②の行動選択から数えています。「手入力」の回数はプレイの想定に合わせて入力してください（空欄は0回として計算します）。
        {blankUsed.length > 0 && <span className="warn"> 未入力の手入力条件が {blankUsed.length} 件あります。</span>}
      </div>

      <Panel
        title="条件の発生回数"
        hint="編成中のカードで使う条件"
        className="span-2"
        actions={blankUsed.length > 0 && <button type="button" className="ghost-btn sm" onClick={fillAll}>未入力の条件に目安を一括入力</button>}
      >
        {used.length ? <ul className="cond-list">{used.map(row)}</ul> : <p className="empty-msg">サポートカードを編成すると表示されます。</p>}
        {unused.length > 0 && (
          <details className="more">
            <summary>その他の条件（今の編成では使わない {unused.length}件）</summary>
            <ul className="cond-list dim">{unused.map(row)}</ul>
          </details>
        )}
      </Panel>

      <Panel title="カードごとの上昇見込み" hint="固定イベント＋条件ごとの「1回あたり × 回数」の合計です。" className="span-2">
        <div className="card-breakdown">
          {r.cards.map((k) => (
            <article key={k.slot} className={`cb ${(k.card.plan as string).toLowerCase()}`}>
              <header>
                <PlanBadge plan={k.card.plan} />
                <span className="cb-name">{k.card.name}</span>
                <span className="cb-sum">+{fmt(k.sum)}</span>
              </header>
              <table>
                <tbody>
                  {k.fixed !== 0 && <tr><td>イベント（固定）</td><td></td><td className="v">+{fmt(k.fixed)}</td></tr>}
                  {k.parts.map((p) => (
                    <tr key={p.cond}>
                      <td>{p.cond}</td>
                      <td className="calc">{p.per} × {p.count}回</td>
                      <td className="v">+{fmt(p.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
          {!r.cards.length && <p className="empty-msg">サポートカードが編成されていません。</p>}
        </div>
      </Panel>
    </div>
  );
}
