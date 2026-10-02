import type { ReactNode } from "react";
import { PARAMS, type Param } from "../lib/master";

export const fmt = (n: number) => n.toLocaleString("ja-JP");
export const isParam = (v: string): v is Param => (PARAMS as readonly string[]).includes(v);

export function PlanBadge({ plan, children }: { plan: string; children?: ReactNode }) {
  return <span className={`badge ${isParam(plan) ? plan.toLowerCase() : "none"}`}>{children ?? plan}</span>;
}

export function Panel({ title, hint, actions, children, className = "" }: {
  title: string; hint?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <div>
          <h3>{title}</h3>
          {hint && <p className="hint">{hint}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

/** ボタン型の単一選択。pendingEmpty のとき、空値（未選択）を選んだ状態を注意色で表示する。 */
export function Segmented<T extends string>({ value, options, onChange, labels, colored, size, pendingEmpty }: {
  value: T; options: readonly T[]; onChange: (v: T) => void; labels?: Partial<Record<T, string>>; colored?: boolean; size?: "sm"; pendingEmpty?: boolean;
}) {
  return (
    <div className={`seg ${size ?? ""}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o || "none"}
          type="button"
          role="radio"
          aria-checked={value === o}
          className={`${value === o ? "on" : ""} ${pendingEmpty && o === "" ? "blank" : ""} ${colored && isParam(o) ? o.toLowerCase() : ""}`}
          onClick={() => onChange(o)}
        >
          {labels?.[o] ?? (o || "なし")}
        </button>
      ))}
    </div>
  );
}

export function NumberInput({ value, onChange, step, max, placeholder, suffix, readOnly, ariaLabel, wide }: {
  value: string | number; onChange?: (v: string) => void; step?: number; max?: number; placeholder?: string; suffix?: string; readOnly?: boolean; ariaLabel?: string; wide?: boolean;
}) {
  return (
    <span className={`num-input ${readOnly ? "ro" : ""} ${wide ? "wide" : ""}`}>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        max={max}
        placeholder={placeholder}
        value={value}
        readOnly={readOnly}
        aria-label={ariaLabel}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </span>
  );
}

/** サポートカードの SP 発生率上昇（0 のパラメータは省略） */
export function SpRate({ sp }: { sp: number[] }) {
  const items = PARAMS.map((p, i) => [p, sp[i]] as const).filter(([, v]) => v);
  return (
    <span className="sp-rate">
      SP発生率 {items.length ? items.map(([p, v]) => <b key={p} className={`h-${p.toLowerCase()}`}>{p}+{v}%</b>) : <b>なし</b>}
    </span>
  );
}

/** 計算の前提条件を示す小さなラベル */
export function Assume({ children }: { children: ReactNode }) {
  return <span className="assume">{children}</span>;
}

/** Vo/Da/Vi の上昇量をコンパクトに並べる */
export function Gains({ v, prefix = "+", hideZero = true }: { v: number[]; prefix?: string; hideZero?: boolean }) {
  return (
    <span className="gains">
      {PARAMS.map((p, i) =>
        hideZero && !v[i] ? <span key={p} className="gain empty" /> : (
          <span key={p} className={`gain ${p.toLowerCase()}`}>{p} {prefix}{fmt(v[i])}</span>
        ),
      )}
    </span>
  );
}
