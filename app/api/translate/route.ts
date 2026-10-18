// แปลย่อหน้าของเปเปอร์เป็นภาษาไทยทีละชุด (streaming)
// ผลลัพธ์แต่ละย่อหน้าขึ้นต้นด้วย [[1]], [[2]], ... เพื่อให้หน้าเว็บจับคู่กับต้นฉบับได้ทันทีที่แปลเสร็จทีละย่อหน้า
import { sameOrigin, streamClaude } from "@/lib/claude";

export const runtime = "edge";

const MAX_BLOCKS = 8;
const MAX_CHARS = 9000;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("forbidden", { status: 403 });

  let body: { paperTitle?: string; section?: string; blocks?: string[] };
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const blocks = body.blocks;
  if (!Array.isArray(blocks) || !blocks.length || blocks.length > MAX_BLOCKS || blocks.some((b) => typeof b !== "string")) {
    return new Response("bad request", { status: 400 });
  }
  if (blocks.join("").length > MAX_CHARS) return new Response("too long", { status: 413 });

  const numbered = blocks.map((b, i) => `[[${i + 1}]]\n${b}`).join("\n\n");
  const prompt = `แปลข้อความจากเปเปอร์วิชาการด้าน AI ต่อไปนี้เป็นภาษาไทย สำหรับนักศึกษา ป.โท สาขา AI

เปเปอร์: ${String(body.paperTitle ?? "").slice(0, 300)}
ส่วน: ${String(body.section ?? "").slice(0, 120)}

กติกา:
- แปลให้ครบทุกประโยค อ่านลื่นแบบภาษาวิชาการไทย ไม่ต้องสรุปหรือตัดทอน
- ศัพท์เทคนิคสำคัญ ให้แปลไทยแล้วตามด้วยศัพท์อังกฤษในวงเล็บ เช่น "การปรับแต่งละเอียด (fine-tuning)" ส่วนชื่อโมเดล ชื่อชุดข้อมูล และตัวย่อ ให้คงเป็นภาษาอังกฤษ
- สมการในเครื่องหมาย $...$ ตัวเลข และการอ้างอิง เช่น [12] ให้คงไว้ตามเดิมทุกตัวอักษร
- ตอบเฉพาะคำแปล ห้ามมีคำอธิบายเพิ่ม
- ตอบเป็น ${blocks.length} ส่วน เรียงตามลำดับ แต่ละส่วนขึ้นต้นด้วยบรรทัด [[เลขเดิม]] เช่น [[1]] แล้วตามด้วยคำแปลของส่วนนั้น

${numbered}`;

  return streamClaude(prompt, 4000);
}
