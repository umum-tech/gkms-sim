import type { Result } from "../lib/calc";
import { PARAMS, PARAM_MAX } from "../lib/master";
import { Assume, fmt } from "./ui";

const SEGMENTS = [
  { key: "start", label: "開始時" },
  { key: "card", label: "サポカ" },
  { key: "lesson", label: "レッスン" },
  { key: "cls", label: "授業" },
  { key: "exam", label: "試験" },
] as const;

export function ResultPanel({ r }: { r: Result }) {
  const seg = (i: number) => ({
    start: r.start[i], card: r.cardGain[i], lesson: r.totals.lesson[i], cls: r.totals.cls[i], exam: r.totals.exam[i],
  });
  const hasOver = r.overflow.some((x) => x > 0);

  return (
    <div className="result">
      <div className="score-card">
        <div className="rank-badge" data-rank={r.rank}>{r.rank || "-"}</div>
        <div>
          <div className="score-label">評価値</div>
          <div className="score">{fmt(r.score)}</div>
          {r.next ? <div className="next">{r.next.rank} まであと <b>{fmt(Math.ceil(r.next.need))}</b></div> : <div className="next">最高ランク</div>}
        </div>
      </div>

      <div className="bars">
        <div className="bars-cap">各パラメータ <Assume>上限 {fmt(PARAM_MAX)}</Assume></div>
        {PARAMS.map((p, i) => {
          const s = seg(i);
          return (
            <div key={p} className="bar-row">
              <div className="bar-head"><span className={`bar-k ${p.toLowerCase()}`}>{p}</span><span>{r.overflow[i] > 0 && <small className="cap-hit">上限到達（超過 {fmt(r.overflow[i])}）</small>}<b>{fmt(r.param[i])}</b></span></div>
              <div className="bar" role="img" aria-label={`${p} ${r.param[i]}`}>
                {SEGMENTS.map((g) => (
                  <span key={g.key} className={`seg-${g.key} ${p.toLowerCase()}`} style={{ width: `${(Math.max(s[g.key], 0) / PARAM_MAX) * 100}%` }} title={`${g.label} ${fmt(s[g.key])}`} />
                ))}
              </div>
            </div>
          );
        })}
        <div className="bar-legend">{SEGMENTS.map((g) => <span key={g.key}><i className={`seg-${g.key}`} />{g.label}</span>)}</div>
      </div>

      <table className="res-table">
        <thead><tr><th></th>{PARAMS.map((p) => <th key={p} className={`h-${p.toLowerCase()}`}>{p}</th>)}</tr></thead>
        <tbody>
          <tr><th>開始時</th>{r.start.map((x, i) => <td key={i}>{fmt(x)}</td>)}</tr>
          <tr><th>サポカ</th>{r.cardGain.map((x, i) => <td key={i}>{fmt(x)}</td>)}</tr>
          <tr><th>レッスン</th>{r.totals.lesson.map((x, i) => <td key={i}>{fmt(x)}</td>)}</tr>
          <tr><th>授業</th>{r.totals.cls.map((x, i) => <td key={i}>{fmt(x)}</td>)}</tr>
          <tr><th>試験</th>{r.totals.exam.map((x, i) => <td key={i}>{fmt(x)}</td>)}</tr>
          {hasOver && <tr className="over"><th>上限超過</th>{r.overflow.map((x, i) => <td key={i}>{x > 0 ? `−${fmt(x)}` : ""}</td>)}</tr>}
          <tr className="total-row"><th>パラメータ</th>{r.param.map((x, i) => <td key={i} className={r.overflow[i] > 0 ? "capped" : ""}>{fmt(x)}</td>)}</tr>
          <tr className="sub"><th>パラボ</th>{r.para.map((x, i) => <td key={i}>{(x * 100).toFixed(1)}%</td>)}</tr>
          <tr className="sub"><th>SP発生率</th>{r.sp.map((x, i) => <td key={i}>{x.toFixed(1)}%</td>)}</tr>
        </tbody>
      </table>
      <div className="res-foot">
        <span>合計 <b>{fmt(r.total)}</b></span>
        <span>本選評価 <b>{fmt(r.e1 + r.e2)}</b></span>
      </div>
    </div>
  );
}
