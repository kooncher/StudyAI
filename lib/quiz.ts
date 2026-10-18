// ตรรกะของโจทย์รายวัน: เลือกชุดประจำวัน สลับตัวเลือก คำนวณ streak และสถิติรายหัวข้อ
// ทุกอย่างคำนวณในเครื่อง ไม่ต้องใช้เซิร์ฟเวอร์หรือ API
import { BANK, TOPICS, type Question, type Topic } from "./quiz-bank";

export const PER_DAY = 3;
const DAY_MS = 86400000;
const BKK_OFFSET = 7 * 3600000;

export const dayIndex = (d = new Date()) => Math.floor((d.getTime() + BKK_OFFSET) / DAY_MS);
export const dayKey = (idx: number) => new Date(idx * DAY_MS).toISOString().slice(0, 10);

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr], r = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ลำดับโจทย์คงที่: สลับในแต่ละหัวข้อ แล้วสลับหัวข้อทีละรอบ ทำให้ 3 ข้อของวันเดียวกันมาจากคนละหัวข้อ
// และเรียงง่ายไปยากโดยรวม (ข้อระดับ 1 มาก่อนในแต่ละหัวข้อ)
export const ORDER: Question[] = (() => {
  const topics = Object.keys(TOPICS) as Topic[];
  const pools = topics.map((t, ti) =>
    shuffle(BANK.filter((q) => q.topic === t), 1000 + ti).sort((a, b) => a.level - b.level),
  );
  const out: Question[] = [];
  for (let round = 0; out.length < BANK.length; round++) {
    for (const t of shuffle(topics.map((_, i) => i), 77 + round)) {
      const q = pools[t].shift();
      if (q) out.push(q);
    }
  }
  return out;
})();

export function dailySet(idx: number): Question[] {
  const n = ORDER.length, start = (((idx * PER_DAY) % n) + n) % n;
  return Array.from({ length: PER_DAY }, (_, k) => ORDER[(start + k) % n]);
}

// ลำดับการแสดงตัวเลือกของแต่ละข้อ (คงที่ต่อข้อ เพื่อไม่ให้คำตอบที่ถูกอยู่ตำแหน่งเดิมเสมอ)
export const choiceOrder = (qid: string) => shuffle([0, 1, 2, 3], hashStr(qid));

// ---------- ข้อมูลที่เก็บในเครื่อง ----------
export type Attempt = { qid: string; topic: Topic; correct: boolean; pick: number; day: string; mode: "daily" | "practice" };
export type QuizState = { daily: Record<string, Record<string, number>>; log: Attempt[] };
export const emptyState = (): QuizState => ({ daily: {}, log: [] });

const KEY = "quiz.v1";
export function loadState(): QuizState {
  try { const v = localStorage.getItem(KEY); if (v) { const s = JSON.parse(v); if (s && s.daily && Array.isArray(s.log)) return s; } } catch {}
  return emptyState();
}
export function saveState(s: QuizState) {
  try { localStorage.setItem(KEY, JSON.stringify({ daily: s.daily, log: s.log.slice(-2000) })); } catch {}
}

export function record(s: QuizState, q: Question, pick: number, mode: Attempt["mode"], today: string): QuizState {
  const a: Attempt = { qid: q.id, topic: q.topic, correct: pick === 0, pick, day: today, mode };
  const daily = mode === "daily" ? { ...s.daily, [today]: { ...(s.daily[today] ?? {}), [q.id]: pick } } : s.daily;
  return { daily, log: [...s.log, a] };
}

const dayDone = (s: QuizState, idx: number) => Object.keys(s.daily[dayKey(idx)] ?? {}).length >= PER_DAY;

// จำนวนวันติดกันที่ทำครบ นับถึงวันนี้ (ถ้าวันนี้ยังไม่ครบ นับถึงเมื่อวานโดยไม่ตัด streak)
export function streak(s: QuizState, todayIdx: number) {
  let d = dayDone(s, todayIdx) ? todayIdx : todayIdx - 1, n = 0;
  while (dayDone(s, d)) { n++; d--; }
  return n;
}

export function topicStats(s: QuizState) {
  const out = {} as Record<Topic, { right: number; total: number }>;
  (Object.keys(TOPICS) as Topic[]).forEach((t) => (out[t] = { right: 0, total: 0 }));
  for (const a of s.log) { out[a.topic].total++; if (a.correct) out[a.topic].right++; }
  return out;
}

// โหมดฝึกเพิ่ม: เลือกหัวข้อที่อ่อนที่สุด (หรือหัวข้อที่ระบุ) แล้วเลือกข้อที่ตอบผิดล่าสุดหรือยังไม่เคยทำก่อน
export function pickPractice(s: QuizState, topic: Topic | "weak", exclude: string[], seed: number): Question {
  let t: Topic;
  if (topic === "weak") {
    const st = topicStats(s);
    t = (Object.keys(st) as Topic[]).sort((a, b) => {
      const ra = st[a].total ? st[a].right / st[a].total : 0.5, rb = st[b].total ? st[b].right / st[b].total : 0.5;
      return ra - rb || st[a].total - st[b].total;
    })[0];
  } else t = topic;

  const lastResult = new Map<string, boolean>();
  for (const a of s.log) lastResult.set(a.qid, a.correct);
  const pool = BANK.filter((q) => q.topic === t && !exclude.includes(q.id));
  const candidates = pool.length ? pool : BANK.filter((q) => q.topic === t);
  const score = (q: Question) => (lastResult.get(q.id) === false ? 0 : lastResult.has(q.id) ? 2 : 1);
  const best = Math.min(...candidates.map(score));
  const top = candidates.filter((q) => score(q) === best);
  return top[Math.floor(mulberry32(seed)() * top.length)];
}
