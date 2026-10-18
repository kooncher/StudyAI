// อธิบายข่าว / เปเปอร์เป็นภาษาไทยด้วย Claude (streaming)
import { sameOrigin, streamClaude } from "@/lib/claude";

export const runtime = "edge";

const CONTEXT =
  "ผู้ใช้เป็นนักศึกษา ป.โท หลักสูตร CSAI (วิทยาการคอมพิวเตอร์และระบบสารสนเทศ สาขาปัญญาประดิษฐ์และระบบอัจฉริยะ) คณะสถิติประยุกต์ NIDA หลักสูตรเน้น AI, Machine Learning, NLP, Computer Vision, Deep Learning, Generative AI และวิชาหลัก Advanced Database Systems, Advanced Computer Networks, Cloud Computing มีแผน 1 (วิทยานิพนธ์) และแผน 2 (ค้นคว้าอิสระ)";

type Body = { kind: string; title: string; summary: string; date: string; source: string };

function buildPrompt(b: Body) {
  const head = `คุณเป็นอาจารย์ที่ปรึกษาด้าน AI ${CONTEXT} ตอบเป็นภาษาไทย กระชับ อ่านง่าย ใช้หัวข้อสั้นๆ (ขึ้นต้นด้วย ###) และ bullet`;
  const body =
    b.kind === "paper"
      ? `อธิบายเปเปอร์นี้:
### สรุปเป็นภาษาไทย (2-3 ประโยค)
### ปัญหาที่เปเปอร์พยายามแก้
### วิธีการหลัก (ใส่ศัพท์อังกฤษในวงเล็บ)
### ความรู้พื้นฐานที่ควรมีก่อนอ่าน
### ไอเดียต่อยอดเป็นวิทยานิพนธ์หรือค้นคว้าอิสระ ขนาดที่นักศึกษา ป.โท ทำได้ (2-3 ข้อ ถ้าใช้ข้อมูลไทยได้ยิ่งดี)
### เชื่อมกับวิชาไหนใน CSAI`
      : `สรุปข่าวนี้:
### สรุปภาษาไทย (2-3 ประโยค)
### ประเด็นสำคัญ (3-5 bullet)
### ศัพท์ที่ควรรู้ (2-3 คำ: ศัพท์อังกฤษ — ความหมายภาษาไทยสั้นๆ)
### เชื่อมกับวิชาไหนใน CSAI (1-2 ประโยค)`;
  return `${head}\n${body}\n\nใช้เฉพาะข้อมูลที่ให้ ห้ามแต่งตัวเลขหรือข้อเท็จจริงเพิ่ม ถ้าข้อมูลไม่พอให้บอกว่าควรเปิดอ่านต้นฉบับ ความยาวไม่เกิน 300 คำ

หัวข้อ: ${b.title}
เนื้อหาย่อ: ${b.summary}
วันที่: ${b.date}  แหล่ง: ${b.source}`;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("forbidden", { status: 403 });
  let b: Body;
  try {
    b = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (typeof b?.title !== "string" || b.title.length > 500 || String(b.summary ?? "").length > 3000) {
    return new Response("bad request", { status: 400 });
  }
  return streamClaude(buildPrompt(b), 1200);
}
