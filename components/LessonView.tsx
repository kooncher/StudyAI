"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LESSONS, loadDone, saveDone, type Block, type Lesson } from "@/lib/lessons";
import { TOPICS } from "@/lib/quiz-bank";
import { BayesCalc, CoinFlip, ConfusionCalc, NormalCurve } from "./widgets";

function BlockView({ b }: { b: Block }) {
  if ("p" in b) return <p>{b.p}</p>;
  if ("f" in b) return <div className="formula"><code>{b.f}</code>{b.note && <span>{b.note}</span>}</div>;
  if ("ex" in b) return (
    <div className="example">
      <span className="label">ตัวอย่าง</span>
      <strong>{b.ex}</strong>
      <ol>{b.lines.map((l, i) => <li key={i}>{l}</li>)}</ol>
    </div>
  );
  if ("tip" in b) return <div className="tip"><span className="label">จุดที่คนพลาดบ่อย</span><p>{b.tip}</p></div>;
  if ("ai" in b) return <div className="aibox"><span className="label">เชื่อมกับ AI / ML</span><p>{b.ai}</p></div>;
  if ("list" in b) return <ul className="llist">{b.list.map((l, i) => <li key={i}>{l}</li>)}</ul>;
  if ("widget" in b) {
    if (b.widget === "coin") return <CoinFlip />;
    if (b.widget === "bayes") return <BayesCalc />;
    if (b.widget === "normal") return <NormalCurve />;
    return <ConfusionCalc />;
  }
  return null;
}

export default function LessonView({ lesson }: { lesson: Lesson }) {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => setDone(loadDone()), [lesson.topic]);
  const isDone = done.includes(lesson.topic);
  const mark = () => { const next = Array.from(new Set([...done, lesson.topic])) as Lesson["topic"][]; setDone(next); saveDone(next); };

  const idx = LESSONS.findIndex((l) => l.topic === lesson.topic);
  const prev = LESSONS[idx - 1], next = LESSONS[idx + 1];
  const color = TOPICS[lesson.topic].color;

  return (
    <div className="wrap reader lesson">
      <div className="rhead">
        <Link href="/learn" className="back">← บทเรียนทั้งหมด</Link>
        <div className="meta">
          <span className="cat" style={{ color }}><span className="dot" style={{ background: color }} />บทที่ {lesson.no} จาก {LESSONS.length}</span>
          <span>อ่านประมาณ {lesson.minutes} นาที</span>
          {isDone && <span className="new">เรียนแล้ว</span>}
        </div>
        <h1 className="rtitle">{lesson.title}</h1>
        <p className="lgoal"><b>เรียนจบแล้วจะ: </b>{lesson.goal}</p>
      </div>

      <div className="rgrid">
        <nav className="toc" aria-label="สารบัญ">
          <span className="label">ในบทนี้</span>
          {lesson.sections.map((s, i) => (
            <a key={i} className="tocitem" href={`#s${i + 1}`}><span className="mono">{i + 1}</span><span>{s.h}</span></a>
          ))}
          <a className="tocitem" href="#terms"><span className="mono">✓</span><span>คำศัพท์สรุป</span></a>
        </nav>

        <article className="rbody lbody">
          {lesson.sections.map((s, i) => (
            <section key={i} id={`s${i + 1}`} className="rsec">
              <div className="rsec-head"><h2><span className="secno mono">{i + 1}</span> {s.h}</h2></div>
              {s.blocks.map((b, j) => <BlockView key={j} b={b} />)}
            </section>
          ))}

          <section id="terms" className="rsec">
            <div className="rsec-head"><h2>คำศัพท์สรุป</h2></div>
            <dl className="terms">
              {lesson.terms.map(([en, th]) => (<div key={en}><dt className="mono">{en}</dt><dd>{th}</dd></div>))}
            </dl>
          </section>

          <div className="lend">
            {!isDone ? (
              <button className="btn primary big" onClick={mark}>เรียนบทนี้จบแล้ว</button>
            ) : (
              <span className="donemark">✓ เรียนบทนี้จบแล้ว</span>
            )}
            <Link className="btn primary primary-link big" href={`/quiz?practice=${lesson.topic}`}>ลองทำโจทย์หัวข้อนี้ →</Link>
          </div>

          <nav className="lnav" aria-label="บทอื่น">
            {prev ? <Link href={`/learn/${prev.topic}`}>← บทที่ {prev.no}: {prev.title}</Link> : <span />}
            {next && <Link href={`/learn/${next.topic}`} className="nextl">บทที่ {next.no}: {next.title} →</Link>}
          </nav>
        </article>
      </div>
    </div>
  );
}
