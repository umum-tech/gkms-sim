import type { ReactNode } from "react";
import type { Result } from "../lib/calc";
import { EXAM, PARAMS, SCHED, type Activity, type Phase, type SimState } from "../lib/master";
import { Gains, Segmented } from "./ui";

type Update = (fn: (s: SimState) => void) => void;
// メイン・授業・試験は必ず選ぶ項目なので「未選択」から始める。サブは「なし」も選べる。
const PARAM_OPTS = ["", "Vo", "Da", "Vi"] as const;
const PARAM_LABELS = { "": "未選択" };
const SUB_OPTS = ["-", "Vo", "Da", "Vi"] as const;
const SUB_LABELS = { "-": "なし" };

const ACT_CLASS: Record<string, string> = { 公開レッスン: "lesson", 授業: "class", 試験: "exam" };
interface Row { phase: Phase; day: number; options: Activity[]; j: number; act: string; gains: number[] | null; control: ReactNode; label: string; pending: boolean }

export function ScheduleStep({ st, update, r, goFinal }: { st: SimState; update: Update; r: Result; goFinal: () => void }) {
  let li = 0, ci = 0, ei = 0;
  const rows: Row[] = SCHED.map(([phase, day, options], j) => {
    const act = options.length === 1 ? options[0] : st.sched[j];
    const base = { phase, day, options, j, act, pending: false };
    if (options.length > 1) {
      return {
        ...base, pending: !act, gains: null, label: "行動を選択",
        control: (
          <div className="ctl">
            <Segmented
              value={st.sched[j] as Activity | ""}
              options={["", ...options] as (Activity | "")[]}
              labels={{ "": "未選択" }}
              onChange={(v) => update((s) => { s.sched[j] = v; })}
            />
          </div>
        ),
      };
    }
    if (act === "公開レッスン") {
      const k = li++;
      const { m, s } = st.lessons[k];
      const main = m.replace(/SP$/, "") as (typeof PARAM_OPTS)[number];
      const sp = m.endsWith("SP");
      const setMain = (nm: string, nsp: boolean) => update((x) => { x.lessons[k].m = nm ? nm + (nsp ? "SP" : "") : ""; });
      return {
        ...base, pending: !main, label: "公開レッスン", gains: r.lesson[k],
        control: (
          <div className="ctl lesson-ctl">
            <div className="ctl-line"><span className="ctl-k">メイン</span>
              <Segmented value={main} options={PARAM_OPTS} labels={PARAM_LABELS} colored size="sm" onChange={(v) => setMain(v, sp)} />
              <label className={`sp-toggle ${sp ? "on" : ""}`}>
                <input type="checkbox" checked={sp} disabled={!main} onChange={(e) => setMain(main, e.target.checked)} />
                SPレッスン
                {main && <small>（発生率 {r.sp[PARAMS.indexOf(main as never)].toFixed(0)}%）</small>}
              </label>
            </div>
            <div className="ctl-line"><span className="ctl-k">サブ</span>
              <Segmented value={s as (typeof SUB_OPTS)[number]} options={SUB_OPTS} labels={SUB_LABELS} colored size="sm" onChange={(v) => update((x) => { x.lessons[k].s = v; })} />
            </div>
          </div>
        ),
      };
    }
    if (act === "授業") {
      const k = ci++;
      return {
        ...base, pending: !st.classes[k], label: "授業", gains: r.cls[k],
        control: (
          <div className="ctl"><div className="ctl-line"><span className="ctl-k">上げる</span>
            <Segmented value={st.classes[k] as (typeof PARAM_OPTS)[number]} options={PARAM_OPTS} labels={PARAM_LABELS} colored size="sm" onChange={(v) => update((x) => { x.classes[k] = v; })} />
          </div></div>
        ),
      };
    }
    if (act === "試験" && phase === "選抜試験") {
      const k = ei++;
      return {
        ...base, pending: !st.exams[k], label: EXAM[k][0], gains: r.exam[k],
        control: (
          <div className="ctl"><div className="ctl-line"><span className="ctl-k">追加上昇</span>
            <Segmented value={st.exams[k] as (typeof PARAM_OPTS)[number]} options={PARAM_OPTS} labels={PARAM_LABELS} colored size="sm" onChange={(v) => update((x) => { x.exams[k] = v; })} />
          </div><span className="ctl-note">全パラメータ +{EXAM[k][1]}、選んだパラメータにさらに +{EXAM[k][2]}（パラボ込み）</span></div>
        ),
      };
    }
    return {
      ...base, label: "本選 最終試験", gains: null,
      control: <div className="ctl"><button type="button" className="link-btn" onClick={goFinal}>スコアは「④ 本選・評価値」で入力 →</button></div>,
    };
  });

  const phases: Phase[] = ["選抜試験", "本選"];
  const unselected = rows.filter((x) => x.pending).length;

  return (
    <div className="schedule">
      <div className="callout">
        <b>1日ずつ、実際に選ぶ行動を設定します。</b>
        公開レッスン・授業・試験で上がるパラメータは、①で設定したパラメータボーナス込みで右側に表示されます。
        行動の選択（相談・差し入れなど）は「③ 達成条件」の回数に自動で反映されます。
        {unselected > 0 && <span className="warn"> 未選択の日が {unselected} 日あります。</span>}
      </div>
      {phases.map((ph) => {
        const pr = rows.filter((x) => x.phase === ph);
        const tot = [0, 1, 2].map((i) => pr.reduce((a, x) => a + (x.gains?.[i] ?? 0), 0));
        return (
          <section key={ph} className="panel phase">
            <header className="phase-head">
              <h3>{ph}<small>{pr.length}日間</small></h3>
              <span className="phase-total">この期間の上昇 <Gains v={tot} hideZero={false} /></span>
            </header>
            <ol className="timeline">
              {pr.map((x) => (
                <li key={x.j} className={`day act-${ACT_CLASS[x.act] ?? (x.options.length > 1 ? "choice" : "other")} ${x.pending ? "pending" : ""}`}>
                  <div className="day-no"><span>{x.day}</span>日目</div>
                  <div className="day-act">{x.options.length > 1 ? (x.act || "未選択") : x.label}</div>
                  <div className="day-ctl">{x.control}</div>
                  <div className="day-gain">{x.gains && <Gains v={x.gains} />}</div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
