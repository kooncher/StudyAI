"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LESSONS, loadDone } from "@/lib/lessons";
import { PER_DAY, dailySet, dayIndex, dayKey, loadState, streak } from "@/lib/quiz";
import { TOPICS } from "@/lib/quiz-bank";

// การ์ดเล็กในแผงด้านขวาของหน้ารวม: บทเรียน + โจทย์วันนี้
export default function QuizCard() {
  const [info, setInfo] = useState<{ done: number; str: number; topics: string[]; learned: string[] } | null>(null);
  useEffect(() => {
    const s = loadState(), idx = dayIndex(), set = dailySet(idx), ans = s.daily[dayKey(idx)] ?? {};
    setInfo({ done: set.filter((q) => ans[q.id] !== undefined).length, str: streak(s, idx), topics: set.map((q) => TOPICS[q.topic].th), learned: loadDone() });
  }, []);
  const done = info?.done ?? 0;
  const learned = info?.learned ?? [];
  const nextLesson = LESSONS.find((l) => !learned.includes(l.topic));
  return (
    <div className="panel target qcardlink">
      <span className="label">ฝึกสถิติ</span>
      <Link href="/learn" className="qrow">
        <span><b>บทเรียน</b> {learned.length}/{LESSONS.length} บท</span>
        <span className="qcta">{nextLesson ? `บทที่ ${nextLesson.no} →` : "ทวน →"}</span>
      </Link>
      {nextLesson && <span className="tsub">ถัดไป: {nextLesson.title}</span>}
      <Link href="/quiz" className="qrow">
        <span><b>โจทย์วันนี้</b> {done >= PER_DAY ? "ครบแล้ว ✓" : `${done}/${PER_DAY} ข้อ`}</span>
        <span className="qcta">{done >= PER_DAY ? "ฝึกเพิ่ม →" : "ทำโจทย์ →"}</span>
      </Link>
      <div className="track"><div className="fill" style={{ width: `${(done / PER_DAY) * 100}%`, background: "var(--accent)" }} /></div>
      <span className="tsub">{info ? `${info.topics.join(" · ")}${info.str ? ` · ทำติดกัน ${info.str} วัน` : ""}` : " "}</span>
    </div>
  );
}
