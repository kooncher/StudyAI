"use client";

import { useMemo, useState } from "react";

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

// ---------- โยนเหรียญ: กฎของจำนวนมาก ----------
export function CoinFlip() {
  const [heads, setHeads] = useState(0);
  const [n, setN] = useState(0);
  const [path, setPath] = useState<number[]>([]);
  const flip = (k: number) => {
    let h = heads, c = n; const pts = [...path];
    for (let i = 0; i < k; i++) { c++; if (Math.random() < 0.5) h++; pts.push(h / c); }
    setHeads(h); setN(c); setPath(pts);
  };
  const reset = () => { setHeads(0); setN(0); setPath([]); };

  const W = 560, H = 180, P = 30;
  const step = Math.max(1, Math.floor(path.length / 400));
  const x = (i: number) => P + (i / Math.max(1, path.length - 1)) * (W - P - 10);
  const y = (v: number) => 10 + (1 - v) * (H - 30);
  const d = path
    .map((v, i) => [v, i] as const)
    .filter(([, i]) => i % step === 0 || i === path.length - 1)
    .map(([v, i], k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");

  return (
    <figure className="widget">
      <figcaption className="wtitle">ลองโยนเหรียญ</figcaption>
      <div className="wrow">
        <button className="btn" onClick={() => flip(10)}>โยน 10 ครั้ง</button>
        <button className="btn" onClick={() => flip(100)}>โยน 100 ครั้ง</button>
        <button className="btn" onClick={() => flip(1000)}>โยน 1,000 ครั้ง</button>
        <button className="btn" onClick={reset} disabled={!n}>เริ่มใหม่</button>
      </div>
      <div className="wnums">
        <span>โยนแล้ว <b className="mono">{n.toLocaleString()}</b> ครั้ง</span>
        <span>ได้หัว <b className="mono">{heads.toLocaleString()}</b></span>
        <span>สัดส่วนหัว <b className="mono">{n ? pct(heads / n) : "–"}</b></span>
      </div>
      <div className="wsvg">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="กราฟสัดส่วนหัวสะสม">
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={P} x2={W - 10} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray={v === 0.5 ? "" : "3 4"} />
              <text x={P - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{v}</text>
            </g>
          ))}
          <text x={W - 12} y={y(0.5) - 6} textAnchor="end" fontSize="11" fill="var(--muted)">ค่าจริง 0.5</text>
          {path.length > 1 && <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" />}
          {!path.length && <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="13" fill="var(--muted)">กดโยนเหรียญเพื่อดูสัดส่วนหัวสะสม</text>}
        </svg>
      </div>
      <p className="wnote">ช่วงแรกเส้นจะแกว่งแรง เมื่อโยนมากขึ้นจะนิ่งใกล้ 0.5 ความคลาดเคลื่อนลดลงตาม 1/√n</p>
    </figure>
  );
}

// ---------- Bayes: base rate ----------
export function BayesCalc() {
  const [prior, setPrior] = useState(1);     // %
  const [sens, setSens] = useState(99);      // %
  const [fpr, setFpr] = useState(5);         // %
  const N = 10000;
  const sick = (N * prior) / 100, healthy = N - sick;
  const tp = (sick * sens) / 100, fp = (healthy * fpr) / 100;
  const post = tp + fp > 0 ? tp / (tp + fp) : 0;
  const r = (v: number) => Math.round(v).toLocaleString();
  return (
    <figure className="widget">
      <figcaption className="wtitle">ผลตรวจบวก ป่วยจริงแค่ไหน</figcaption>
      <label className="wslider">
        <span>โรคพบในประชากร (prior)</span><b className="mono">{prior}%</b>
        <input id="bayes-prior" type="range" min={0.1} max={50} step={0.1} value={prior} onChange={(e) => setPrior(Number(e.target.value))} />
      </label>
      <label className="wslider">
        <span>ป่วยจริงแล้วตรวจเจอ (sensitivity)</span><b className="mono">{sens}%</b>
        <input id="bayes-sens" type="range" min={50} max={100} step={1} value={sens} onChange={(e) => setSens(Number(e.target.value))} />
      </label>
      <label className="wslider">
        <span>ไม่ป่วยแต่ผลบวก (false positive rate)</span><b className="mono">{fpr}%</b>
        <input id="bayes-fpr" type="range" min={0.5} max={30} step={0.5} value={fpr} onChange={(e) => setFpr(Number(e.target.value))} />
      </label>
      <div className="wbar" aria-hidden="true">
        <div style={{ width: pct(tp / Math.max(1, tp + fp)), background: "var(--cat-research)" }} />
        <div style={{ flex: 1, background: "var(--cat-safety)", opacity: 0.75 }} />
      </div>
      <div className="wnums">
        <span><i className="dot" style={{ background: "var(--cat-research)" }} /> บวกและป่วยจริง <b className="mono">{r(tp)}</b> คน</span>
        <span><i className="dot" style={{ background: "var(--cat-safety)" }} /> บวกลวง <b className="mono">{r(fp)}</b> คน</span>
      </div>
      <p className="wbig">ผลตรวจบวก → ป่วยจริง <b className="mono">{pct(post)}</b></p>
      <p className="wnote">คิดจากคน {N.toLocaleString()} คน: ป่วย {r(sick)} คน ไม่ป่วย {r(healthy)} คน ลองเลื่อน prior ขึ้นเป็น 20% แล้วดูว่าคำตอบเปลี่ยนแค่ไหน ทั้งที่ชุดตรวจเหมือนเดิม</p>
    </figure>
  );
}

// ---------- Normal 68–95–99.7 ----------
export function NormalCurve() {
  const [k, setK] = useState(1);
  const W = 560, H = 190, base = 160, mid = W / 2, sx = 80; // 1σ = 80px
  const pdf = (z: number) => Math.exp(-0.5 * z * z);
  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let z = -3.4; z <= 3.401; z += 0.05) pts.push(`${(mid + z * sx).toFixed(1)},${(base - pdf(z) * 130).toFixed(1)}`);
    return pts;
  }, []);
  const area = useMemo(() => {
    const pts = [`${mid - k * sx},${base}`];
    for (let z = -k; z <= k + 0.001; z += 0.05) pts.push(`${(mid + z * sx).toFixed(1)},${(base - pdf(z) * 130).toFixed(1)}`);
    pts.push(`${mid + k * sx},${base}`);
    return pts.join(" ");
  }, [k]);
  const share = { 1: "≈ 68%", 2: "≈ 95%", 3: "≈ 99.7%" }[k as 1 | 2 | 3];
  return (
    <figure className="widget">
      <figcaption className="wtitle">การแจกแจงแบบปกติ</figcaption>
      <div className="wrow seg" role="group" aria-label="เลือกช่วง">
        {[1, 2, 3].map((v) => <button key={v} aria-pressed={k === v} onClick={() => setK(v)}>μ ± {v}σ</button>)}
      </div>
      <div className="wsvg">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`พื้นที่ในช่วง ±${k}σ ${share}`}>
          <polygon points={area} fill="var(--accent)" fillOpacity="0.22" />
          <polyline points={curve.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2" />
          <line x1={20} x2={W - 20} y1={base} y2={base} stroke="var(--line)" />
          {[-3, -2, -1, 0, 1, 2, 3].map((z) => (
            <g key={z}>
              <line x1={mid + z * sx} x2={mid + z * sx} y1={base} y2={base + 5} stroke="var(--muted)" />
              <text x={mid + z * sx} y={base + 20} textAnchor="middle" fontSize="12" fill="var(--muted)">{z === 0 ? "μ" : `${z > 0 ? "+" : "−"}${Math.abs(z)}σ`}</text>
            </g>
          ))}
          <text x={mid} y={base - 50} textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--ink)">{share}</text>
        </svg>
      </div>
      <p className="wnote">พื้นที่ใต้โค้งคือความน่าจะเป็น พื้นที่ทั้งหมดเท่ากับ 1 ค่าที่ห่างจาก μ เกิน 2σ จึงพบได้แค่ราว 5%</p>
    </figure>
  );
}

// ---------- Confusion matrix ----------
export function ConfusionCalc() {
  const [v, setV] = useState({ tp: 40, fp: 10, fn: 20, tn: 930 });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Math.max(0, Math.floor(Number(e.target.value) || 0)) });
  const total = v.tp + v.fp + v.fn + v.tn;
  const div = (a: number, b: number) => (b ? a / b : NaN);
  const acc = div(v.tp + v.tn, total), prec = div(v.tp, v.tp + v.fp), rec = div(v.tp, v.tp + v.fn);
  const f1 = div(2 * prec * rec, prec + rec);
  const show = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : "–");
  const cell = (k: keyof typeof v, label: string, cls: string) => (
    <label className={`cm-cell ${cls}`}>
      <span>{label}</span>
      <input id={`cm-${k}`} type="number" min={0} inputMode="numeric" value={v[k]} onChange={set(k)} />
    </label>
  );
  return (
    <figure className="widget">
      <figcaption className="wtitle">Confusion matrix</figcaption>
      <div className="cm">
        <span />
        <span className="cm-h">ทายว่าบวก</span>
        <span className="cm-h">ทายว่าลบ</span>
        <span className="cm-h side">บวกจริง</span>
        {cell("tp", "TP", "good")}
        {cell("fn", "FN", "bad")}
        <span className="cm-h side">ลบจริง</span>
        {cell("fp", "FP", "bad")}
        {cell("tn", "TN", "good")}
      </div>
      <div className="cm-metrics">
        <div><span className="label">Accuracy</span><b className="mono">{show(acc)}</b></div>
        <div><span className="label">Precision</span><b className="mono">{show(prec)}</b></div>
        <div><span className="label">Recall</span><b className="mono">{show(rec)}</b></div>
        <div><span className="label">F1</span><b className="mono">{show(f1)}</b></div>
      </div>
      <div className="wrow">
        <button className="btn" onClick={() => setV({ tp: 0, fp: 0, fn: 10, tn: 990 })}>ลองโมเดลที่ทายว่าลบทุกครั้ง</button>
        <button className="btn" onClick={() => setV({ tp: 40, fp: 10, fn: 20, tn: 930 })}>ค่าเริ่มต้น</button>
      </div>
      <p className="wnote">กด “ทายว่าลบทุกครั้ง” แล้วดู accuracy กับ recall ตัวเลขชุดนี้คือข้อมูลที่บวกจริงมีแค่ 1%</p>
    </figure>
  );
}
