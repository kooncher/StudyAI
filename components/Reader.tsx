"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PaperDoc } from "@/lib/paper";

type Mode = "bi" | "th" | "en";
type Status = "idle" | "busy" | "done" | "error";

const MODES: { k: Mode; label: string }[] = [
  { k: "bi", label: "สองภาษา" },
  { k: "th", label: "ไทย" },
  { k: "en", label: "ต้นฉบับ" },
];
const SIZES = [15, 17, 19];
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const fmtDate = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${TH_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`; };

const store = {
  get<T>(k: string): T | null { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// แบ่งย่อหน้าเป็นชุดเล็กๆ ส่งไปแปลทีละชุด จะได้เห็นผลเร็วและไม่ชนเวลาจำกัดของ Vercel
function batches(texts: string[], maxBlocks = 6, maxChars = 6000) {
  const out: { start: number; items: string[] }[] = [];
  let cur: string[] = [], start = 0, chars = 0;
  texts.forEach((t, i) => {
    if (cur.length && (cur.length >= maxBlocks || chars + t.length > maxChars)) { out.push({ start, items: cur }); cur = []; chars = 0; start = i; }
    cur.push(t); chars += t.length;
  });
  if (cur.length) out.push({ start, items: cur });
  return out;
}

// อ่านผลที่กำลัง stream: "[[1]] คำแปล ... [[2]] คำแปล ..."
function parseMarked(acc: string): Record<number, string> {
  const out: Record<number, string> = {};
  const parts = acc.split(/\[\[(\d+)\]\]\s*/);
  // ตัดเครื่องหมายที่ยังส่งมาไม่ครบท้ายข้อความ เช่น "[[2" ระหว่าง stream
  for (let i = 1; i < parts.length; i += 2) out[Number(parts[i])] = (parts[i + 1] ?? "").replace(/\[\[?\d*\]?$/, "").trim();
  return out;
}

export default function Reader({ doc, aiEnabled }: { doc: PaperDoc; aiEnabled: boolean }) {
  const { meta, sections } = doc;
  const id = meta.arxivId;
  const [mode, setMode] = useState<Mode>("bi");
  const [size, setSize] = useState(1);
  const [tr, setTr] = useState<Record<number, string[]>>({});
  const [status, setStatus] = useState<Record<number, Status>>({});
  const [errMsg, setErrMsg] = useState("");
  const started = useRef(false);

  // ข้อความที่ต้องแปลของแต่ละส่วน (ส่วนแรกแปลชื่อเปเปอร์ไปพร้อมกัน)
  const textsOf = useCallback((si: number) => {
    const t = sections[si].blocks.map((b) => b.text);
    return si === 0 ? [meta.title, ...t] : [sections[si].title, ...t];
  }, [sections, meta.title]);

  useEffect(() => {
    const m = store.get<Mode>("reader.mode"); if (m) setMode(m);
    const s = store.get<number>("reader.size"); if (s != null) setSize(s);
    const cached: Record<number, string[]> = {}, st: Record<number, Status> = {};
    sections.forEach((_, si) => { const v = store.get<string[]>(`tr:${id}:${si}`); if (v) { cached[si] = v; st[si] = "done"; } });
    setTr(cached); setStatus(st);
  }, [id, sections]);

  const translate = useCallback(async (si: number) => {
    if (!aiEnabled) return;
    const texts = textsOf(si);
    setStatus((s) => ({ ...s, [si]: "busy" })); setErrMsg("");
    const result: string[] = new Array(texts.length).fill("");
    try {
      for (const b of batches(texts)) {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paperTitle: meta.title, section: sections[si].title, blocks: b.items }),
        });
        if (!res.ok || !res.body) throw new Error((await res.text()) || String(res.status));
        const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          const parsed = parseMarked(acc);
          for (const [k, v] of Object.entries(parsed)) { const idx = b.start + Number(k) - 1; if (idx < result.length) result[idx] = v; }
          setTr((t) => ({ ...t, [si]: [...result] }));
        }
      }
      store.set(`tr:${id}:${si}`, result);
      setStatus((s) => ({ ...s, [si]: "done" }));
    } catch (e) {
      setStatus((s) => ({ ...s, [si]: "error" }));
      setErrMsg(e instanceof Error && e.message.length < 120 ? e.message : "แปลไม่สำเร็จ ลองกดใหม่อีกครั้ง");
    }
  }, [aiEnabled, textsOf, meta.title, sections, id]);

  // แปล abstract ให้อัตโนมัติเมื่อเปิดหน้า
  useEffect(() => {
    if (started.current || !aiEnabled) return;
    const t = setTimeout(() => {
      started.current = true;
      if (!store.get(`tr:${id}:0`)) translate(0);
    }, 50);
    return () => clearTimeout(t);
  }, [aiEnabled, id, translate]);

  const pickMode = (m: Mode) => { setMode(m); store.set("reader.mode", m); };
  const pickSize = (d: number) => { const s = Math.max(0, Math.min(SIZES.length - 1, size + d)); setSize(s); store.set("reader.size", s); };

  const doneCount = sections.filter((_, si) => status[si] === "done").length;
  const busyAny = Object.values(status).includes("busy");
  const nextSi = sections.findIndex((_, si) => status[si] !== "done");
  const thTitle = tr[0]?.[0];

  const goto = (si: number) => document.getElementById(`sec-${si}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="wrap reader" style={{ ["--read-size" as string]: `${SIZES[size]}px` }}>
      <div className="rhead">
        <Link href="/" className="back">← กลับหน้ารวม</Link>
        <div className="meta">
          <span className="cat" style={{ color: "var(--cat-research)" }}><span className="dot" style={{ background: "var(--cat-research)" }} />{meta.primaryCategory}</span>
          <span className="mono">arXiv {id}</span>
          <span>{fmtDate(meta.date)}</span>
          <span className="course">{meta.course}</span>
        </div>
        {mode === "th" && thTitle ? (
          <>
            <h1 className="rtitle">{thTitle}</h1>
            <div className="rtitle-en">{meta.title}</div>
          </>
        ) : (
          <>
            <h1 className="rtitle">{meta.title}</h1>
            {mode === "bi" && thTitle && <div className="rtitle-th">{thTitle}</div>}
          </>
        )}
        <div className="authors">{meta.authors.slice(0, 8).join(", ")}{meta.authors.length > 8 ? " และคณะ" : ""}</div>
        <div className="rlinks">
          <a href={meta.url} target="_blank" rel="noopener noreferrer">หน้า arXiv ↗</a>
          <a href={`https://arxiv.org/pdf/${id}`} target="_blank" rel="noopener noreferrer">PDF ↗</a>
          {doc.htmlUrl && <a href={doc.htmlUrl} target="_blank" rel="noopener noreferrer">HTML ต้นฉบับ (มีรูปและตาราง) ↗</a>}
        </div>
      </div>

      <div className="toolbar" role="toolbar" aria-label="ตัวเลือกการอ่าน">
        <div className="seg" role="group" aria-label="ภาษา">
          {MODES.map((m) => <button key={m.k} aria-pressed={mode === m.k} onClick={() => pickMode(m.k)}>{m.label}</button>)}
        </div>
        <div className="seg" role="group" aria-label="ขนาดตัวอักษร">
          <button onClick={() => pickSize(-1)} aria-label="ตัวอักษรเล็กลง" disabled={size === 0}>ก−</button>
          <button onClick={() => pickSize(1)} aria-label="ตัวอักษรใหญ่ขึ้น" disabled={size === SIZES.length - 1}>ก+</button>
        </div>
        {aiEnabled ? (
          <div className="tprog">
            <span className="mono">แปลแล้ว {doneCount}/{sections.length} ส่วน</span>
            {nextSi >= 0 && (
              <button className="btn primary" disabled={busyAny} onClick={() => translate(nextSi)}>
                {busyAny ? "กำลังแปล…" : `แปลส่วนถัดไป: ${sections[nextSi].title}`}
              </button>
            )}
          </div>
        ) : (
          <span className="tnote">ใส่ ANTHROPIC_API_KEY ใน Vercel เพื่อเปิดการแปลภาษาไทย</span>
        )}
      </div>
      {errMsg && <div className="note">{errMsg}</div>}
      {!doc.hasFullText && (
        <div className="note">เปเปอร์นี้ยังไม่มีเวอร์ชัน HTML บน arXiv จึงอ่านและแปลได้เฉพาะ abstract ส่วนเนื้อหาเต็มเปิดอ่านได้จากลิงก์ PDF</div>
      )}

      <div className="rgrid">
        <nav className="toc" aria-label="สารบัญ">
          <span className="label">สารบัญ</span>
          {sections.map((s, si) => (
            <button key={si} onClick={() => goto(si)} className="tocitem">
              <span className={`tdot ${status[si] ?? "idle"}`} aria-hidden="true" />
              <span>{mode !== "en" && tr[si]?.[0] && si > 0 ? tr[si][0] : s.title}</span>
            </button>
          ))}
        </nav>

        <article className="rbody">
          {sections.map((s, si) => {
            const t = tr[si] ?? [];
            const st = status[si] ?? "idle";
            const headTh = si > 0 ? t[0] : undefined;
            return (
              <section key={si} id={`sec-${si}`} className="rsec">
                <div className="rsec-head">
                  <h2>
                    {mode === "th" && headTh ? headTh : s.title}
                    {mode === "bi" && headTh && <span className="h-th">{headTh}</span>}
                  </h2>
                  {aiEnabled && mode !== "en" && st !== "done" && (
                    <button className="btn" disabled={st === "busy"} onClick={() => translate(si)}>
                      {st === "busy" ? "กำลังแปล…" : st === "error" ? "ลองแปลอีกครั้ง" : "แปลส่วนนี้"}
                    </button>
                  )}
                </div>
                {s.blocks.map((b, bi) => {
                  const th = t[bi + 1];
                  const Tag = b.kind === "h" ? "h3" : "p";
                  if (mode === "en") return <Tag key={bi} className="orig">{b.text}</Tag>;
                  if (mode === "th") {
                    return th
                      ? <Tag key={bi} className="th-only">{th}</Tag>
                      : <Tag key={bi} className="orig pending">{b.text}</Tag>;
                  }
                  return (
                    <div key={bi} className={`pair ${b.kind}`}>
                      <Tag className="orig">{b.text}</Tag>
                      {th ? <Tag className="trans">{th}</Tag> : st === "busy" ? <div className="trans wait" aria-hidden="true" /> : null}
                    </div>
                  );
                })}
              </section>
            );
          })}
          <footer>คำแปลสร้างด้วย AI อาจคลาดเคลื่อนได้ ก่อนอ้างอิงในรายงานหรือวิทยานิพนธ์ ให้ตรวจกับต้นฉบับภาษาอังกฤษเสมอ คำแปลเก็บไว้ในเบราว์เซอร์เครื่องนี้ เปิดซ้ำไม่ต้องแปลใหม่</footer>
        </article>
      </div>
    </div>
  );
}
