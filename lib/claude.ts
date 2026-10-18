// เรียก Claude API แล้วส่งข้อความกลับแบบ streaming (key อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น)

export function sameOrigin(req: Request) {
  // กันเว็บอื่นมาเรียก API ของเราแล้วใช้เครดิตของเรา
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  try {
    return Boolean(origin && host && new URL(origin).host === host);
  } catch {
    return false;
  }
}

export async function streamClaude(prompt: string, maxTokens: number): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return new Response("ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY", { status: 503 });

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: maxTokens,
      stream: true,
      messages: [{ role: "user", content: prompt }],
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
