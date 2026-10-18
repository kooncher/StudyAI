"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LESSONS, loadDone } from "@/lib/lessons";
import { loadState, topicStats } from "@/lib/quiz";
import { TOPICS, type Topic } from "@/lib/quiz-bank";

export default function LearnIndex() {
  const [done, setDone] = useState<string[]>([]);
  const [acc, setAcc] = useState<Record<string, { right: number; total: number }>>({});
  useEffect(() => { setDone(loadDone()); setAcc(topicStats(loadState())); }, []);
  const next = LESSONS.find((l) => !done.includes(l.topic));
  const total = LESSONS.reduce((s, l) => s + l.minutes, 0);

  return (
    <div className="wrap learn">
      <div className="rhead">
        <Link href="/" className="back">← กลับหน้ารวม</Link>
        <h1 className="rtitle">สถิติสำหรับ AI จากศูนย์</h1>
        <p className="lgoal">6 บท เรียงจากพื้นฐานไปถึงการใช้งานจริง ใช้เวลารวมประมาณ {Math.round(total / 60 * 10) / 10} ชั่วโมง แต่ละบทมีตัวอย่าง ของเล่นให้ลองกด และโจทย์ฝึกท้ายบท แนะนำให้เรียนตามลำดับ วันละบทก็พอ</p>
        <div className="lprog">
          <span className="mono">เรียนแล้ว {done.length}/{LESSONS.length} บท</span>
          <div className="track"><div className="fill" style={{ width: `${(done.length / LESSONS.length) * 100}%`, background: "var(--accent)" }} /></div>
          {next && <Link className="btn primary primary-link" href={`/learn/${next.topic}`}>{done.length ? "เรียนบทถัดไป" : "เริ่มบทที่ 1"} →</Link>}
        </div>
      </div>

      <ol className="lessons">
        {LESSONS.map((l) => {
          const t = TOPICS[l.topic as Topic], isDone = done.includes(l.topic), a = acc[l.topic];
          return (
            <li key={l.topic}>
              <Link href={`/learn/${l.topic}`} className={`lcard${isDone ? " done" : ""}`}>
                <span className="lno mono" style={{ borderColor: t.color, color: t.color }}>{isDone ? "✓" : l.no}</span>
                <span className="lmain">
                  <strong>{l.title}</strong>
                  <span className="lsub">{l.goal}</span>
                  <span className="lmeta">
                    <span>{l.minutes} นาที</span>
                    <span>{l.sections.length} หัวข้อย่อย</span>
                    {a && a.total > 0 && <span>ทำโจทย์แล้ว {a.total} ข้อ · ถูก {Math.round((a.right / a.total) * 100)}%</span>}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <footer>ความคืบหน้าเก็บในเบราว์เซอร์ของเครื่องนี้ บทเรียนเขียนให้เข้าใจหลักการก่อน ถ้าจะลงลึกต่อ ใช้แหล่งทวนในหน้าโจทย์ เช่น OpenIntro Statistics</footer>
    </div>
  );
}
