import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "../lib/data";
import { PARAMS } from "../lib/master";
import { Assume, PlanBadge, Segmented, SpRate } from "./ui";

type Sort = "sum" | "sp" | "name";
const SORT_LABEL: Record<Sort, string> = { sum: "上昇量合計", sp: "SP発生率", name: "名前" };

export function CardPicker({ cards, slot, current, taken, onPick, onClose }: {
  cards: Card[]; slot: number; current: string; taken: string[]; onPick: (name: string) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState<string>("");
  const [sort, setSort] = useState<Sort>("sum");
  const [spOnly, setSpOnly] = useState(false);

  useEffect(() => { ref.current?.showModal(); }, []);

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const r = cards.filter((c) => (!plan || c.plan === plan) && (!spOnly || c.sp.some(Boolean)) && (!kw || c.name.toLowerCase().includes(kw)));
    const key: Record<Sort, (c: Card) => number> = { sum: (c) => c.sumRef, sp: (c) => Math.max(...c.sp), name: () => 0 };
    return sort === "name" ? r.sort((a, b) => a.name.localeCompare(b.name, "ja")) : r.sort((a, b) => key[sort](b) - key[sort](a));
  }, [cards, q, plan, sort, spOnly]);

  return (
    <dialog ref={ref} className="picker" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()}>
      <div className="picker-body">
        <header className="picker-head">
          <h3>サポートカード {slot + 1} を選ぶ <Assume>上限解放4・レベル上限想定</Assume></h3>
          <button type="button" className="icon-btn" aria-label="閉じる" onClick={() => ref.current?.close()}>✕</button>
        </header>
        <div className="picker-tools">
          <input type="search" placeholder="カード名で検索" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <Segmented value={plan} options={["", ...PARAMS]} labels={{ "": "すべて" }} onChange={setPlan} colored size="sm" />
          <label className={`sp-toggle ${spOnly ? "on" : ""}`}>
            <input type="checkbox" checked={spOnly} onChange={(e) => setSpOnly(e.target.checked)} />
            SP発生率ありのみ
          </label>
          <label className="sort">並び順
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {(Object.keys(SORT_LABEL) as Sort[]).map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
            </select>
          </label>
        </div>
        <p className="picker-count">{list.length}枚</p>
        <ul className="picker-list">
          {current && (
            <li><button type="button" className="pick-item clear" onClick={() => { onPick(""); ref.current?.close(); }}>このスロットを空にする</button></li>
          )}
          {list.map((c) => {
            const used = taken.includes(c.name) && c.name !== current;
            return (
              <li key={c.name}>
                <button
                  type="button"
                  className={`pick-item ${c.name === current ? "current" : ""}`}
                  disabled={used}
                  onClick={() => { onPick(c.name); ref.current?.close(); }}
                >
                  <PlanBadge plan={c.plan} />
                  <span className="pick-name">{c.name}{used && <small>（編成済み）</small>}</span>
                  <span className="pick-stats">
                    <span>合計 <b>{c.sumRef}</b></span>
                    <SpRate sp={c.sp} />
                  </span>
                </button>
              </li>
            );
          })}
          {!list.length && <li className="empty-msg">該当するカードがありません</li>}
        </ul>
      </div>
    </dialog>
  );
}
