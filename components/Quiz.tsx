"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TOPICS, type Question, type Topic } from "@/lib/quiz-bank";
import { LESSONS, lessonOf, loadDone } from "@/lib/lessons";
import {
  PER_DAY, choiceOrder, dailySet, dayIndex, dayKey, emptyState, loadState, pickPractice, record, saveState, streak, topicStats, type QuizState,
} from "@/lib/quiz";

const LEVEL = { 1: "พื้นฐาน", 2: "กลาง", 3: "ท้าทาย" } as const;
const LETTERS = ["ก", "ข", "ค", "ง"];

function QuestionCard({ q, n, picked, onPick }: { q: Question; n?: number; picked?: number; onPick: (orig: number) => void }) {
  const order = choiceOrder(q.id);
  const answered = picked !== undefined;
  const t = TOPICS[q.topic];
  return (
    <article className="qcard">
      <div className="meta">
        {n !== undefined && <span className="mono qn">ข้อ {n}</span>}
        <span className="cat" style={{ color: t.color }}><span className="dot" style={{ background: t.color }} />{t.th}</span>
        <span className={`lvl l${q.level}`}>{LEVEL[q.level]}</span>
      </div>
      <h3 className="qtext">{q.q}</h3>
      <div className="choices" role="group" aria-label="ตัวเลือก">
        {order.map((orig, i) => {
          const state = !answered ? "" : orig === 0 ? " right" : orig === picked ? " wrong" : " dim";
          return (
            <button key={orig} className={`choice${state}`} disabled={answered} onClick={() => onPick(orig)} aria-pressed={picked === orig}>
              <span className="letter mono">{LETTERS[i]}</span>
              <span>{q.choices[orig]}</span>
              {answered && orig === 0 && <span className="mark" aria-label="คำตอบที่ถูก">✓</span>}
              {answered && orig === picked && orig !== 0 && <span className="mark" aria-label="คำตอบที่เลือก">✗</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`explain ${picked === 0 ? "ok" : "no"}`} aria-live="polite">
          <b>{picked === 0 ? "ถูกต้อง" : "ยังไม่ถูก"}</b>
          <p>{q.explain}</p>
          {picked !== 0 && <Link className="review" href={`/learn/${q.topic}`}>ทวนบทที่ {lessonOf(q.topic).no}: {lessonOf(q.topic).title} →</Link>}
        </div>
      )}
    </article>
  );
}

export default function Quiz() {
  const [ready, setReady] = useState(false);
  const [s, setS] = useState<QuizState>(emptyState);
  const [today, setToday] = useState(0);
  const [practice, setPractice] = useState<{ q: Question; picked?: number } | null>(null);
  const [ptopic, setPtopic] = useState<Topic | "weak">("weak");
  const [seen, setSeen] = useState<string[]>([]);

  const [learned, setLearned] = useState<string[]>([]);
  const [autoPractice, setAutoPractice] = useState<Topic | null>(null);

  useEffect(() => {
    setS(loadState()); setToday(dayIndex()); setLearned(loadDone()); setReady(true);
    const t = new URLSearchParams(window.location.search).get("practice");
    if (t && t in TOPICS) { setPtopic(t as Topic); setAutoPractice(t as Topic); }
  }, []);

  // เปิดจากปุ่ม "ลองทำโจทย์หัวข้อนี้" ในบทเรียน: เริ่มโหมดฝึกหัวข้อนั้นทันที
  useEffect(() => {
    if (!ready || !autoPractice) return;
    nextPractice(autoPractice);
    setAutoPractice(null);
    setTimeout(() => document.getElementById("practice")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, autoPractice]);

  const key = dayKey(today);
  const set = useMemo(() => dailySet(today), [today]);
  const answers = s.daily[key] ?? {};
  const doneToday = set.filter((q) => answers[q.id] !== undefined).length;
  const rightToday = set.filter((q) => answers[q.id] === 0).length;
  const st = topicStats(s);
  const str = streak(s, today);

  const update = (next: QuizState) => { setS(next); saveState(next); };
  const pickDaily = (q: Question, orig: number) => { if (answers[q.id] === undefined) update(record(s, q, orig, "daily", key)); };

  const nextPractice = (topic = ptopic) => {
    const q = pickPractice(s, topic, [...seen.slice(-20), ...set.map((x) => x.id)], Date.now() % 100000);
    setSeen((v) => [...v, q.id]);
    setPractice({ q });
  };
  const pickPracticeAns = (orig: number) => {
    if (!practice || practice.picked !== undefined) return;
    update(record(s, practice.q, orig, "practice", key));
    setPractice({ ...practice, picked: orig });
  };

  if (!ready) return <div className="wrap"><div className="empty"><strong>กำลังโหลดโจทย์…</strong></div></div>;

  const [y, m, d] = key.split("-").map(Number);
  const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  return (
    <div className="wrap quiz">
      <div className="rhead">
        <Link href="/" className="back">← กลับหน้ารวม</Link>
        <h1 className="rtitle">โจทย์สถิติวันนี้</h1>
        <div className="sub">{d} {TH_MONTHS[m - 1]} {y + 543} · วันละ {PER_DAY} ข้อ เปลี่ยนชุดทุกเที่ยงคืน</div>
      </div>

      {learned.length < LESSONS.length && (
        <div className="lessonbanner">
          <span>{learned.length === 0 ? <><strong>ยังไม่เคยเรียนสถิติ?</strong> เริ่มจากบทเรียนก่อน แล้วค่อยกลับมาทำโจทย์ จะเข้าใจเฉลยมากขึ้น</> : <>เรียนไปแล้ว {learned.length}/{LESSONS.length} บท โจทย์บางข้ออาจมาจากบทที่ยังไม่ได้เรียน</>}</span>
          <Link className="btn primary primary-link" href="/learn">{learned.length === 0 ? "เริ่มบทที่ 1" : "ไปที่บทเรียน"} →</Link>
        </div>
      )}

      <div className="qstats">
        <div className="qstat"><span className="label">ทำติดกัน</span><span className="big mono">{str}</span><span>วัน</span></div>
        <div className="qstat"><span className="label">วันนี้</span><span className="big mono">{doneToday}/{PER_DAY}</span><span>{doneToday === PER_DAY ? `ถูก ${rightToday} ข้อ` : "ข้อ"}</span></div>
        <div className="qstat"><span className="label">ทำไปแล้วทั้งหมด</span><span className="big mono">{s.log.length}</span><span>ข้อ</span></div>
      </div>

      <div className="grid">
        <main className="qlist">
          {set.map((q, i) => (
            <QuestionCard key={q.id} q={q} n={i + 1} picked={answers[q.id]} onPick={(o) => pickDaily(q, o)} />
          ))}

          {doneToday === PER_DAY && (
            <div className="donebox">
              <strong>{rightToday === PER_DAY ? "ครบและถูกทุกข้อ เยี่ยมมาก" : `ทำครบแล้ว ถูก ${rightToday} จาก ${PER_DAY} ข้อ`}</strong>
              <span>พรุ่งนี้มีชุดใหม่ ถ้าอยากฝึกต่อ เลือกหัวข้อแล้วกด “ฝึกเพิ่ม”</span>
            </div>
          )}

          <section className="practice" id="practice">
            <h2>ฝึกเพิ่ม</h2>
            <div className="chips" role="group" aria-label="เลือกหัวข้อ">
              <button className="chip" aria-pressed={ptopic === "weak"} onClick={() => setPtopic("weak")}>หัวข้อที่ยังอ่อน</button>
              {(Object.keys(TOPICS) as Topic[]).map((t) => (
                <button key={t} className="chip" aria-pressed={ptopic === t} onClick={() => setPtopic(t)}>
                  <span className="dot" style={{ background: TOPICS[t].color }} />{TOPICS[t].th}
                </button>
              ))}
            </div>
            {practice ? (
              <>
                <QuestionCard key={practice.q.id + seen.length} q={practice.q} picked={practice.picked} onPick={pickPracticeAns} />
                {practice.picked !== undefined && <button className="btn primary" onClick={() => nextPractice()}>ข้อต่อไป</button>}
              </>
            ) : (
              <button className="btn primary" onClick={() => nextPractice()}>เริ่มฝึก</button>
            )}
          </section>
        </main>

        <aside>
          <div className="panel">
            <h2>ความแม่นตามหัวข้อ</h2>
            <div className="bars">
              {(Object.keys(TOPICS) as Topic[]).map((t) => {
                const v = st[t], pct = v.total ? Math.round((v.right / v.total) * 100) : 0;
                return (
                  <div className="bar qbar" key={t}>
                    <span>{TOPICS[t].th}</span>
                    <div className="track"><div className="fill" style={{ width: `${pct}%`, background: TOPICS[t].color }} /></div>
                    <span className="mono">{v.total ? `${pct}%` : "–"}</span>
                  </div>
                );
              })}
            </div>
            <p className="tsub">นับทั้งโจทย์รายวันและโหมดฝึกเพิ่ม หัวข้อที่เปอร์เซ็นต์ต่ำคือเรื่องที่ควรทวน</p>
          </div>
          <div className="panel">
            <h2>แหล่งทวนเพิ่ม (ฟรี)</h2>
            <ul className="srcs links">
              <li><a href="https://www.openintro.org/book/os/" target="_blank" rel="noopener noreferrer">OpenIntro Statistics ↗</a></li>
              <li><a href="https://www.khanacademy.org/math/statistics-probability" target="_blank" rel="noopener noreferrer">Khan Academy: Statistics ↗</a></li>
              <li><a href="https://www.statlearning.com/" target="_blank" rel="noopener noreferrer">An Introduction to Statistical Learning ↗</a></li>
              <li><a href="https://seeing-theory.brown.edu/" target="_blank" rel="noopener noreferrer">Seeing Theory (ภาพเคลื่อนไหว) ↗</a></li>
            </ul>
          </div>
        </aside>
      </div>
      <footer>คะแนนและประวัติเก็บในเบราว์เซอร์ของเครื่องนี้ ถ้าเปลี่ยนเครื่องหรือล้างข้อมูลเบราว์เซอร์ ประวัติจะเริ่มใหม่</footer>
    </div>
  );
}
