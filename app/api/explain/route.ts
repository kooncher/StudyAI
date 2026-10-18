// อธิบายข่าว/เปเปอร์เป็นภาษาไทยด้วย Claude แล้วส่งข้อความกลับแบบ streaming
// API key อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น (ไม่หลุดไปที่เบราว์เซอร์)

export const runtime = "edge";

const CONTEXT =
  "ผู้ใช้เป็นนักศึกษา ป.โท หลักสูตร CSAI (วิทยาการคอมพิวเตอร์และระบบสารสนเทศ สาขาปัญญาประดิษฐ์และระบบอัจฉริยะ) คณะสถิติประยุกต์ NIDA หลักสูตรเน้น AI, Machine Learning, NLP, Computer Vision, Deep Learning, Generative AI และวิชาหลัก Advanced Database Systems, Advanced Computer Networks, Cloud Computing มีแผน 1 (วิทยานิพนธ์) และแผน 2 (ค้นคว้าอิสระ)";

function buildPrompt(b: { kind: string; title: string; summary: string; date: string; source: string }) {
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
      : `อธิบายข่าวนี้:
### สรุปเป็นภาษาไทย (2-3 ประโยค)
### พื้นหลังที่ต้องรู้
### แนวคิด/เทคนิคสำคัญ (ใส่ศัพท์อังกฤษในวงเล็บ)
### เชื่อมกับวิชาไหนใน CSAI
### ประเด็นที่ต่อยอดเป็นรายงาน วิทยานิพนธ์ หรือค้นคว้าอิสระได้ (2 ข้อ)`;
  return `${head}\n${body}\n\nอธิบายจากข้อมูลที่ให้เท่านั้น ห้ามแต่งตัวเลขหรือข้อเท็จจริงเพิ่ม ถ้าไม่แน่ใจให้บอกว่าควรเปิดอ่านต้นฉบับ ความยาวไม่เกิน 300 คำ

หัวข้อ: ${b.title}
เนื้อหาย่อ: ${b.summary}
วันที่: ${b.date}  แหล่ง: ${b.source}`;
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return new Response("ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY", { status: 503 });

  // กันเว็บอื่นมาเรียก API นี้แล้วใช้เครดิตของเรา: รับเฉพาะคำขอจากหน้าเว็บของเราเอง
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return new Response("forbidden", { status: 403 });

  let b: { kind: string; title: string; summary: string; date: string; source: string };
  try {
    b = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (typeof b?.title !== "string" || b.title.length > 500 || String(b.summary ?? "").length > 3000) {
    return new Response("bad request", { status: 400 });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 1200,
      stream: true,
      messages: [{ role: "user", content: buildPrompt(b) }],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const msg = upstream.status === 429 ? "ใช้งานถี่เกินไป รอสักครู่แล้วลองใหม่" : `Claude API ตอบกลับ ${upstream.status}`;
    return new Response(msg, { status: 502 });
  }

  // แปลง Server-Sent Events ของ Anthropic เป็นข้อความล้วน
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = "";
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(line.slice(5));
            if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") controller.enqueue(enc.encode(ev.delta.text));
          } catch {}
        }
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
