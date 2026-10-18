"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Category, Course, FeedData, FeedItem, NewsItem, PaperItem } from "@/lib/types";
import QuizCard from "./QuizCard";

const CATS: Record<Category, { th: string; color: string }> = {
  model: { th: "โมเดล & ผลิตภัณฑ์", color: "var(--cat-model)" },
  research: { th: "งานวิจัย", color: "var(--cat-research)" },
  policy: { th: "นโยบาย & กฎหมาย", color: "var(--cat-policy)" },
  business: { th: "ธุรกิจ & การลงทุน", color: "var(--cat-business)" },
  safety: { th: "ความปลอดภัย AI", color: "var(--cat-safety)" },
};
const COURSES: Course[] = [
  "Artificial Intelligence", "Machine Learning", "Deep Learning", "Generative AI", "Natural Language Processing",
  "Computer Vision", "Cloud Computing", "Advanced Database Systems", "Human-Computer Interaction", "Research & Ethics",
];
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// วันที่แบบเวลาไทย
const bkk = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
const dayKey = (iso: string) => bkk(iso).toISOString().slice(0, 10);
const fmtStamp = (iso: string) => {
  const d = bkk(iso);
  return `${d.getUTCDate()} ${TH_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543} · ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} น.`;
};
const isNew = (iso: string) => Date.now() - new Date(iso).getTime() < 24 * 3600 * 1000;

type View = "all" | "unread" | "saved";
type Tab = "news" | "papers";

function useStoredSet(key: string) {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setSet(new Set(JSON.parse(raw))); } catch {}
  }, [key]);
  const toggle = (id: string) =>
    setSet((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch {}
      return next;
    });
  return [set, toggle] as const;
}

function mdLite(s: string) {
  // แปลง markdown ง่ายๆ ที่ Claude ตอบกลับ เป็นโครงสร้าง React ปลอดภัย (ไม่ใช้ innerHTML)
  const blocks: JSX.Element[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{bold(l)}</li>)}</ul>); list = []; } };
  const bold = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p));
  for (const line of s.split("\n")) {
    if (/^#{1,4}\s+/.test(line)) { flush(); blocks.push(<h4 key={blocks.length}>{line.replace(/^#{1,4}\s+/, "")}</h4>); }
    else if (/^\s*[-*•]\s+/.test(line)) list.push(line.replace(/^\s*[-*•]\s+/, ""));
    else if (!line.trim()) flush();
    else { flush(); blocks.push(<p key={blocks.length}>{bold(line)}</p>); }
  }
  flush();
  return blocks;
}

export default function Dashboard({ data, aiEnabled }: { data: FeedData; aiEnabled: boolean }) {
  const [tab, setTab] = useState<Tab>("news");
  const [cat, setCat] = useState<Category | "all">("all");
  const [course, setCourse] = useState<Course | "">("");
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const [saved, toggleSaved] = useStoredSet("radar.saved");
  const [read, toggleRead] = useStoredSet("radar.read");
  const [deep, setDeep] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try { const t = localStorage.getItem("radar.tab"); if (t === "papers" || t === "news") setTab(t); } catch {}
  }, []);
  const switchTab = (t: Tab) => { setTab(t); setCourse(""); try { localStorage.setItem("radar.tab", t); } catch {} };

  const items: FeedItem[] = tab === "news" ? data.news : data.papers;

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((n) =>
      (tab !== "news" || cat === "all" || (n as NewsItem).category === cat) &&
      (!course || n.course === course) &&
      (view !== "saved" || saved.has(n.id)) &&
      (view !== "unread" || !read.has(n.id)) &&
      (!needle || `${n.title} ${n.summary}`.toLowerCase().includes(needle)),
    );
  }, [items, tab, cat, course, view, q, saved, read]);

  const byDay = useMemo(() => {
    const m = new Map<string, FeedItem[]>();
    for (const n of list) { const k = dayKey(n.date); m.set(k, [...(m.get(k) ?? []), n]); }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [list]);

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    data.news.forEach((n) => (c[n.category] = (c[n.category] ?? 0) + 1));
    return c;
  }, [data.news]);
  const courseCounts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((n) => (c[n.course] = (c[n.course] ?? 0) + 1));
    return c;
  }, [items]);
  const maxCat = Math.max(1, ...Object.values(catCounts));
  const readCount = items.filter((n) => read.has(n.id)).length;

  async function explain(n: FeedItem) {
    setBusy((b) => ({ ...b, [n.id]: true }));
    setDeep((d) => ({ ...d, [n.id]: "กำลังคิด…" }));
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: n.kind, title: n.title, summary: n.summary, date: n.date, source: n.kind === "news" ? n.source : "arXiv " + n.arxivId }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setDeep((d) => ({ ...d, [n.id]: acc }));
      }
    } catch (e) {
      setDeep((d) => ({ ...d, [n.id]: "อธิบายไม่สำเร็จ ลองกดใหม่อีกครั้ง" }));
    } finally {
      setBusy((b) => ({ ...b, [n.id]: false }));
    }
  }

  const failed = data.sources.filter((s) => !s.ok);

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <svg className="scope" viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="20" fill="none" stroke="var(--line)" strokeWidth="1.5" />
            <circle cx="22" cy="22" r="12" fill="none" stroke="var(--line)" strokeWidth="1.5" />
            <path d="M22 22 L22 2 A20 20 0 0 1 39.3 12 Z" fill="var(--accent)" opacity=".28" />
            <line x1="22" y1="22" x2="22" y2="2" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="31" cy="11" r="2.6" fill="var(--signal)" />
            <circle cx="13" cy="28" r="2" fill="var(--cat-research)" />
          </svg>
          <div>
            <h1>เรดาร์ AI ป.โท</h1>
            <div className="sub">ข่าวและเปเปอร์ AI ดึงตรงจากแหล่ง สำหรับเรียน CSAI ที่ NIDA</div>
          </div>
        </div>
        <div className="status">
          <span className="label">ดึงข้อมูลล่าสุด</span>
          <span><span className="pulse" aria-hidden="true" />{fmtStamp(data.fetchedAt)}</span>
          <span className="label">รีเฟรชอัตโนมัติทุก 30 นาที</span>
          <button className="refresh" onClick={() => location.reload()}>โหลดใหม่</button>
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="ส่วนของหน้า">
        <button className="tab" role="tab" aria-selected={tab === "news"} onClick={() => switchTab("news")}>ข่าว AI <span className="n mono">{data.news.length}</span></button>
        <button className="tab" role="tab" aria-selected={tab === "papers"} onClick={() => switchTab("papers")}>เปเปอร์ arXiv <span className="n mono">{data.papers.length}</span></button>
      </nav>

      <div className="controls">
        {tab === "news" ? (
          <div className="chips" role="group" aria-label="กรองตามหมวด">
            <button className="chip" aria-pressed={cat === "all"} onClick={() => setCat("all")}>ทุกหมวด <span className="n">{data.news.length}</span></button>
            {(Object.keys(CATS) as Category[]).map((k) => (
              <button key={k} className="chip" aria-pressed={cat === k} onClick={() => setCat(k)}>
                <span className="dot" style={{ background: CATS[k].color }} />{CATS[k].th} <span className="n">{catCounts[k] ?? 0}</span>
              </button>
            ))}
          </div>
        ) : <div className="chips" />}
        <div className="views" role="group" aria-label="มุมมอง">
          {(["all", "unread", "saved"] as View[]).map((v) => (
            <button key={v} className="chip" aria-pressed={view === v} onClick={() => setView(v)}>{v === "all" ? "ทั้งหมด" : v === "unread" ? "ยังไม่อ่าน" : "บันทึกไว้"}</button>
          ))}
          <input id="q" className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "news" ? "ค้นหา เช่น agent, Gemini" : "ค้นหา เช่น diffusion, RAG"} />
        </div>
      </div>

      <div className="grid">
        <main className="feed">
          {!items.length ? (
            <div className="empty"><strong>ยังดึงข้อมูลไม่ได้</strong><span>แหล่งข้อมูลอาจไม่ตอบชั่วคราว กด “โหลดใหม่” อีกครั้งในอีกสักครู่</span></div>
          ) : !list.length ? (
            <div className="empty"><strong>ไม่มีรายการในมุมมองนี้</strong><span>{view === "saved" ? "กด “บันทึก” ที่รายการไหนก็ได้ แล้วจะมาอยู่ที่นี่" : "ลองเปลี่ยนหมวด วิชา หรือคำค้นหา"}</span></div>
          ) : (
            byDay.map(([d, rows]) => {
              const [y, m, day] = d.split("-").map(Number);
              return (
                <section className="day" key={d}>
                  <div className="dayhead"><div className="d mono">{day}</div><div className="m">{TH_MONTHS[m - 1]} {y + 543}</div></div>
                  <div className="items">
                    {rows.map((n) => (
                      <Card key={n.id} n={n} read={read.has(n.id)} saved={saved.has(n.id)} deep={deep[n.id]} busy={!!busy[n.id]} aiEnabled={aiEnabled}
                        onRead={() => toggleRead(n.id)} onSave={() => toggleSaved(n.id)} onExplain={() => explain(n)} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </main>

        <aside>
          <QuizCard />
          <div className="panel target">
            <span className="label">หลักสูตร</span>
            <h2>NIDA · CSAI</h2>
            <p className="tsub">ป.โท วิทยาการคอมพิวเตอร์และระบบสารสนเทศ สาขาปัญญาประดิษฐ์และระบบอัจฉริยะ</p>
            <span className="label">วิชา · กดเพื่อกรอง</span>
            <div className="courses">
              {COURSES.map((c) => (
                <button key={c} className="course" aria-pressed={course === c} onClick={() => setCourse(course === c ? "" : c)}>{c} · {courseCounts[c] ?? 0}</button>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>ความคืบหน้าการอ่าน</h2>
            <div><span className="mono" style={{ fontFamily: "var(--f-display)", fontSize: 28, fontWeight: 700 }}>{readCount}</span> จาก {items.length} {tab === "news" ? "ข่าว" : "เปเปอร์"}</div>
            <div className="track"><div className="fill" style={{ width: `${items.length ? (readCount / items.length) * 100 : 0}%`, background: "var(--accent)" }} /></div>
          </div>

          {tab === "news" && (
            <div className="panel">
              <h2>ภาพรวมตามหมวด</h2>
              <div className="bars">
                {(Object.keys(CATS) as Category[]).map((k) => (
                  <div className="bar" key={k}>
                    <span>{CATS[k].th}</span>
                    <div className="track"><div className="fill" style={{ width: `${((catCounts[k] ?? 0) / maxCat) * 100}%`, background: CATS[k].color }} /></div>
                    <span className="mono">{catCounts[k] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel">
            <h2>สถานะแหล่งข้อมูล</h2>
            <ul className="srcs">
              {data.sources.map((s) => (
                <li key={s.name}><span>{s.name}</span><span className={`mono ${s.ok ? "ok" : "fail"}`}>{s.ok ? `${s.count} รายการ` : "ไม่ตอบ"}</span></li>
              ))}
            </ul>
            {failed.length > 0 && <div className="note">บางแหล่งไม่ตอบในรอบนี้ ระบบจะลองใหม่อัตโนมัติในรอบถัดไป</div>}
          </div>

          {!aiEnabled && (
            <div className="note">ยังไม่ได้ใส่ ANTHROPIC_API_KEY ปุ่มสรุปไทยและการแปลเปเปอร์จึงยังใช้ไม่ได้ ดูวิธีเปิดใน README</div>
          )}
        </aside>
      </div>

      <footer>ข่าวมาจาก RSS ของแต่ละสำนักข่าว และเปเปอร์มาจาก arXiv API ก่อนนำไปอ้างอิงในรายงานหรือวิทยานิพนธ์ ให้เปิดอ่านต้นฉบับเสมอ</footer>
    </div>
  );
}

function Card(props: {
  n: FeedItem; read: boolean; saved: boolean; deep?: string; busy: boolean; aiEnabled: boolean;
  onRead: () => void; onSave: () => void; onExplain: () => void;
}) {
  const { n, read, saved, deep, busy, aiEnabled } = props;
  const isNews = n.kind === "news";
  const c = isNews ? CATS[(n as NewsItem).category] : { th: (n as PaperItem).primaryCategory, color: "var(--cat-research)" };
  return (
    <article className={`item${read ? " is-read" : ""}`}>
      <div className="meta">
        <span className="cat" style={{ color: c.color }}><span className="dot" style={{ background: c.color }} />{c.th}</span>
        <span>{isNews ? (n as NewsItem).source : `arXiv ${(n as PaperItem).arxivId}`}</span>
        {isNew(n.date) && <span className="new">ใหม่</span>}
      </div>
      <h3>{isNews ? n.title : <Link href={`/paper/${(n as PaperItem).arxivId}`} className="tlink">{n.title}</Link>}</h3>
      {!isNews && <div className="authors">{(n as PaperItem).authors.slice(0, 4).join(", ")}{(n as PaperItem).authors.length > 4 ? " และคณะ" : ""}</div>}
      {n.summary && <p>{n.summary}</p>}
      <div className="link">เชื่อมกับวิชา <span className="course">{n.course}</span></div>
      {deep && <div className="deep" aria-live="polite">{mdLite(deep)}</div>}
      <div className="actions">
        <button className="btn" aria-pressed={read} onClick={props.onRead}>{read ? "อ่านแล้ว ✓" : "ทำเครื่องหมายว่าอ่านแล้ว"}</button>
        <button className="btn" aria-pressed={saved} onClick={props.onSave}>{saved ? "บันทึกแล้ว" : "บันทึก"}</button>
        {!isNews && <Link className="btn primary primary-link" href={`/paper/${(n as PaperItem).arxivId}`}>เปิดอ่าน + แปลไทย</Link>}
        {aiEnabled && (
          <button className={`btn${isNews ? " primary" : ""}`} disabled={busy} onClick={props.onExplain}>
            {busy ? "กำลังสรุป…" : deep ? "สรุปใหม่" : isNews ? "สรุปไทย + ประเด็นสำคัญ" : "อธิบายเชิงลึก"}
          </button>
        )}
        <a className="src" href={n.url} target="_blank" rel="noopener noreferrer">{isNews ? "อ่านข่าวเต็ม" : "อ่านเปเปอร์"} ↗</a>
      </div>
    </article>
  );
}
