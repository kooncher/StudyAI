import { parse, type HTMLElement } from "node-html-parser";
import { parseArxiv } from "./sources";
import type { PaperItem } from "./types";

export type Block = { kind: "h" | "p"; text: string };
export type Section = { title: string; blocks: Block[] };
export type PaperDoc = {
  meta: PaperItem;
  sections: Section[]; // sections[0] คือ Abstract เสมอ
  hasFullText: boolean;
  htmlUrl?: string;
};

const MAX_BLOCKS = 260;
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

// แปลง HTML ที่ arXiv สร้างด้วย LaTeXML ให้เป็นหัวข้อ + ย่อหน้า
export function parseArxivHtml(html: string): Section[] {
  const root = parse(html);
  const doc = root.querySelector("article") ?? root.querySelector(".ltx_document") ?? root;

  // สมการ: ใช้ข้อความ LaTeX จาก alttext แทน MathML
  for (const m of doc.querySelectorAll("math")) {
    const tex = m.getAttribute("alttext");
    m.replaceWith(tex ? ` $${tex}$ ` : "");
  }
  // ตัดส่วนที่ไม่ใช่เนื้อความ
  for (const sel of ["figure", "table", ".ltx_bibliography", ".ltx_note", ".ltx_tag_section", ".ltx_tag_subsection", ".ltx_tag_subsubsection", ".ltx_page_footer", ".ltx_authors", "nav", "script", "style"]) {
    for (const el of doc.querySelectorAll(sel)) el.remove();
  }

  const sections: Section[] = [];
  let total = 0;
  for (const sec of doc.querySelectorAll("section.ltx_section")) {
    const h = sec.querySelector("h2.ltx_title, h2");
    const title = clean(h?.text ?? "") || `ส่วนที่ ${sections.length + 1}`;
    const blocks: Block[] = [];
    for (const el of sec.querySelectorAll("h3.ltx_title, h4.ltx_title, p.ltx_p") as HTMLElement[]) {
      const text = clean(el.text);
      if (!text) continue;
      if (el.tagName === "P") {
        if (text.length < 25) continue;
        blocks.push({ kind: "p", text });
      } else {
        blocks.push({ kind: "h", text });
      }
      if (++total >= MAX_BLOCKS) break;
    }
    if (blocks.some((b) => b.kind === "p")) sections.push({ title, blocks });
    if (total >= MAX_BLOCKS) break;
  }
  return sections;
}

export const isArxivId = (id: string) => /^(\d{4}\.\d{4,5}|[a-z-]+(\.[A-Z]{2})?\/\d{7})(v\d+)?$/.test(id);

async function get(url: string, revalidate: number) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ai-radar-csai/0.1 (student project)" },
    next: { revalidate },
    signal: AbortSignal.timeout(15000),
  });
  return res;
}

export async function loadPaper(id: string): Promise<PaperDoc | null> {
  if (process.env.MOCK_FEEDS === "1") return (await import("./mock-paper")).mockPaper(id);

  const metaRes = await get(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`, 86400);
  if (!metaRes.ok) return null;
  const meta = parseArxiv(await metaRes.text(), 5000)[0];
  if (!meta || !meta.title) return null;

  const abstract: Section = { title: "Abstract", blocks: [{ kind: "p", text: meta.summary }] };
  let sections: Section[] = [];
  const htmlUrl = `https://arxiv.org/html/${id}`;
  try {
    const res = await get(htmlUrl, 86400);
    if (res.ok) sections = parseArxivHtml(await res.text());
  } catch {}

  return { meta, sections: [abstract, ...sections], hasFullText: sections.length > 0, htmlUrl: sections.length ? htmlUrl : undefined };
}
