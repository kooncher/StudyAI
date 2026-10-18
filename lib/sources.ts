import { XMLParser } from "fast-xml-parser";
import { classifyCategory, classifyCourse, looksLikeAI } from "./classify";
import type { FeedData, NewsItem, PaperItem } from "./types";

// ---------- แหล่งข้อมูล (แก้ / เพิ่มได้ตามใจ) ----------
export const NEWS_FEEDS: { name: string; url: string; lang: "en" | "th"; filterAI?: boolean }[] = [
  { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", lang: "en" },
  { name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", lang: "en" },
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", lang: "en" },
  { name: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", lang: "en" },
  { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", lang: "en" },
  { name: "Blognone", url: "https://www.blognone.com/atom.xml", lang: "th", filterAI: true },
];

// หมวด arXiv ที่ตรงกับ CSAI
export const ARXIV_CATEGORIES = ["cs.AI", "cs.CL", "cs.CV", "cs.LG"];
const ARXIV_MAX = 60;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
});

const asArray = <T,>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) return String((v as Record<string, unknown>)["#text"]);
  return "";
};
export const stripHtml = (s: string) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&#039;|&rsquo;|&lsquo;/g, "'").replace(/&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"').replace(/&#8211;|&#8212;|&mdash;|&ndash;/g, "-")
    .replace(/\s+/g, " ").trim();
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const toIso = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(); };

// ---------- RSS 2.0 และ Atom ----------
export function parseFeed(xml: string, feed: (typeof NEWS_FEEDS)[number]): NewsItem[] {
  const doc = parser.parse(xml);
  const rssItems = asArray(doc?.rss?.channel?.item);
  const atomEntries = asArray(doc?.feed?.entry);
  const raw = rssItems.length
    ? rssItems.map((it: any) => ({
        title: text(it.title),
        link: text(it.link) || text(it.guid),
        body: text(it["content:encoded"]) || text(it.description),
        date: text(it.pubDate) || text(it["dc:date"]),
      }))
    : atomEntries.map((e: any) => {
        const links = asArray(e.link);
        const alt = links.find((l: any) => !l["@_rel"] || l["@_rel"] === "alternate") ?? links[0];
        return {
          title: text(e.title),
          link: alt?.["@_href"] ?? text(e.id),
          body: text(e.summary) || text(e.content),
          date: text(e.published) || text(e.updated),
        };
      });

  return raw
    .filter((r) => r.title && r.link)
    .map((r) => {
      const title = stripHtml(r.title);
      const summary = clip(stripHtml(r.body), 320);
      const blob = `${title} ${summary}`;
      return { title, summary, blob, link: r.link.trim(), date: toIso(r.date) };
    })
    .filter((r) => !feed.filterAI || looksLikeAI(r.blob))
    .map((r) => ({
      id: "n-" + hash(r.link),
      kind: "news" as const,
      title: r.title,
      summary: r.summary,
      url: r.link,
      source: feed.name,
      lang: feed.lang,
      date: r.date,
      category: classifyCategory(r.blob),
      course: classifyCourse(r.blob),
    }));
}

// ---------- arXiv API (Atom) ----------
export function parseArxiv(xml: string): PaperItem[] {
  const doc = parser.parse(xml);
  return asArray(doc?.feed?.entry).map((e: any) => {
    const absUrl = text(e.id);
    const arxivId = absUrl.split("/abs/")[1]?.replace(/v\d+$/, "") ?? absUrl;
    const title = stripHtml(text(e.title));
    const summary = stripHtml(text(e.summary));
    const primary = e["arxiv:primary_category"]?.["@_term"] ?? asArray(e.category)[0]?.["@_term"] ?? "cs.AI";
    return {
      id: "p-" + arxivId,
      kind: "paper" as const,
      arxivId,
      title,
      summary: clip(summary, 600),
      url: `https://arxiv.org/abs/${arxivId}`,
      authors: asArray(e.author).map((a: any) => text(a.name)).filter(Boolean),
      primaryCategory: primary,
      date: toIso(text(e.published)),
      course: classifyCourse(`${title} ${summary}`, primary),
    };
  });
}

async function get(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "ai-radar-csai/0.1 (student project)" },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

export async function loadFeeds(): Promise<FeedData> {
  if (process.env.MOCK_FEEDS === "1") return (await import("./mock")).MOCK;
  const arxivQuery = ARXIV_CATEGORIES.map((c) => `cat:${c}`).join("+OR+");
  const arxivUrl = `https://export.arxiv.org/api/query?search_query=${arxivQuery}&sortBy=submittedDate&sortOrder=descending&max_results=${ARXIV_MAX}`;

  const [arxivRes, ...newsRes] = await Promise.allSettled([
    get(arxivUrl).then(parseArxiv),
    ...NEWS_FEEDS.map((f) => get(f.url).then((x) => parseFeed(x, f))),
  ]);

  const sources = [
    { name: "arXiv", ok: arxivRes.status === "fulfilled", count: arxivRes.status === "fulfilled" ? arxivRes.value.length : 0 },
    ...NEWS_FEEDS.map((f, i) => {
      const r = newsRes[i];
      return { name: f.name, ok: r.status === "fulfilled", count: r.status === "fulfilled" ? r.value.length : 0 };
    }),
  ];

  const seen = new Set<string>();
  const news = newsRes
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((n) => (seen.has(n.url) ? false : (seen.add(n.url), true)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 120);

  const papers = arxivRes.status === "fulfilled" ? arxivRes.value : [];

  return { news, papers, fetchedAt: new Date().toISOString(), sources };
}
