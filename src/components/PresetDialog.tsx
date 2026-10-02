import { useEffect, useRef, useState } from "react";
import type { Result } from "../lib/calc";
import type { SimState } from "../lib/master";
import { loadPresets, newId, savePresets, type Preset } from "../lib/presets";
import { fmt } from "./ui";

const stamp = (iso: string) => new Date(iso).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

export function PresetDialog({ st, r, onLoad, onLoadSample, onClose }: {
  st: SimState; r: Result | null; onLoad: (s: SimState) => void; onLoadSample: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [list, setList] = useState<Preset[]>(loadPresets);
  const [name, setName] = useState(() => [st.idol || "アイドル未選択", r?.rank].filter(Boolean).join(" "));
  const [msg, setMsg] = useState("");

  useEffect(() => { ref.current?.showModal(); }, []);
  const close = () => ref.current?.close();

  const persist = (next: Preset[], done: string) => {
    if (savePresets(next)) { setList(next); setMsg(done); }
    else setMsg("保存できませんでした（ブラウザの保存領域が使えない状態です）");
  };
  const snapshot = (p: Pick<Preset, "id" | "name">): Preset => ({
    ...p, savedAt: new Date().toISOString(), state: structuredClone(st), score: r?.score ?? null, rank: r?.rank ?? "",
  });

  const saveNew = () => {
    const n = name.trim() || "無題の編成";
    persist([snapshot({ id: newId(), name: n }), ...list], `「${n}」を保存しました`);
  };
  const overwrite = (p: Preset) => {
    if (!confirm(`「${p.name}」をいまの入力で上書きしますか？`)) return;
    persist([snapshot(p), ...list.filter((x) => x.id !== p.id)], `「${p.name}」を上書き保存しました`);
  };
  const remove = (p: Preset) => {
    if (!confirm(`「${p.name}」を削除しますか？`)) return;
    persist(list.filter((x) => x.id !== p.id), `「${p.name}」を削除しました`);
  };
  const load = (label: string, fn: () => void) => {
    if (!confirm(`「${label}」を呼び出しますか？\nいまの入力は置き換わります（必要なら先に保存してください）。`)) return;
    fn();
    close();
  };

  return (
    <dialog ref={ref} className="picker preset" onClose={onClose} onClick={(e) => e.target === ref.current && close()}>
      <div className="picker-body">
        <header className="picker-head">
          <h3>編成の保存・呼び出し</h3>
          <button type="button" className="icon-btn" aria-label="閉じる" onClick={close}>✕</button>
        </header>

        <div className="preset-save">
          <p className="hint">①〜④のすべての入力内容を名前を付けて保存します。</p>
          <div className="preset-save-row">
            <input type="text" value={name} maxLength={40} placeholder="保存名" aria-label="保存名" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveNew()} />
            <button type="button" className="primary-btn" onClick={saveNew}>いまの入力を保存</button>
          </div>
          {msg && <p className="preset-msg" role="status">{msg}</p>}
        </div>

        <ul className="preset-list">
          {list.map((p) => (
            <li key={p.id} className="preset-item">
              <div className="preset-info">
                <span className="preset-name">{p.name}</span>
                <span className="preset-meta">
                  {stamp(p.savedAt)}
                  {p.score !== null && <> ・ 評価値 <b>{fmt(p.score)}</b>{p.rank && <>（{p.rank}）</>}</>}
                </span>
              </div>
              <div className="preset-actions">
                <button type="button" className="primary-btn sm" onClick={() => load(p.name, () => onLoad(p.state))}>呼び出す</button>
                <button type="button" className="ghost-btn sm" onClick={() => overwrite(p)}>上書き</button>
                <button type="button" className="ghost-btn sm danger" onClick={() => remove(p)}>削除</button>
              </div>
            </li>
          ))}
          {!list.length && <li className="empty-msg">保存した編成はまだありません</li>}
          <li className="preset-item sample">
            <div className="preset-info">
              <span className="preset-name">サンプル編成（花海咲季）</span>
              <span className="preset-meta">入力例。呼び出すと評価値 35,064.5（S5）の編成になります</span>
            </div>
            <div className="preset-actions">
              <button type="button" className="ghost-btn sm" onClick={() => load("サンプル編成", onLoadSample)}>呼び出す</button>
            </div>
          </li>
        </ul>

        <p className="hint preset-note">
          保存先はこのブラウザです。別の端末やブラウザとは共有されず、ブラウザのサイトデータを消去すると消えます。
        </p>
      </div>
    </dialog>
  );
}
