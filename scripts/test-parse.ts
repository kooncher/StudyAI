// ทดสอบตัวแปลง RSS / Atom / arXiv ด้วยข้อมูลตัวอย่าง (ไม่ต้องต่ออินเทอร์เน็ต)
import { parseArxiv, parseFeed } from "../lib/sources";

const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
<item><title>OpenAI raises $10 billion for new data center</title><link>https://example.com/a</link>
<description><![CDATA[<p>The startup said the GPU cluster will train models.</p>]]></description><pubDate>Sat, 17 Oct 2026 10:00:00 GMT</pubDate></item>
<item><title>EU regulators open AI Act probe</title><link>https://example.com/b</link><description>Commission policy news</description><pubDate>Fri, 16 Oct 2026 08:00:00 GMT</pubDate></item>
</channel></rss>`;

const atomTh = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Blognone</title>
<entry><title>Google เปิดตัว Gemini รุ่นใหม่</title><link rel="alternate" href="https://www.blognone.com/node/1"/><published>2026-10-17T03:00:00Z</published><summary>รายละเอียด AI</summary></entry>
<entry><title>รีวิวมือถือรุ่นใหม่</title><link href="https://www.blognone.com/node/2"/><published>2026-10-17T02:00:00Z</published><summary>กล้องดีขึ้น</summary></entry>
</feed>`;

const arxiv = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
<entry><id>http://arxiv.org/abs/2610.17439v1</id><published>2026-10-12T17:00:00Z</published>
<title>Large Language Models Extend Known
  Research</title><summary>We embed 26.9 million papers and LLM hypotheses.</summary>
<author><name>Zhihua Liu</name></author><author><name>Kurt Butler</name></author>
<arxiv:primary_category term="cs.CL"/><category term="cs.CL"/><category term="cs.AI"/></entry>
<entry><id>http://arxiv.org/abs/2610.18356v2</id><published>2026-10-13T10:00:00Z</published>
<title>Urbex: Agentic Spatial Grounding for City-Scale 3D Scenes</title><summary>A vision-language agent.</summary>
<author><name>A. Author</name></author><arxiv:primary_category term="cs.CV"/></entry>
</feed>`;

const assert = (c: unknown, m: string) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };

const n = parseFeed(rss, { name: "Test", url: "", lang: "en" });
assert(n.length === 2, "rss count");
assert(n[0].category === "business" && n[0].course === "Cloud Computing", `rss classify ${n[0].category}/${n[0].course}`);
assert(n[0].summary === "The startup said the GPU cluster will train models.", "rss strip html: " + n[0].summary);
assert(n[1].category === "policy", "policy classify " + n[1].category);

const t = parseFeed(atomTh, { name: "Blognone", url: "", lang: "th", filterAI: true });
assert(t.length === 1 && t[0].url === "https://www.blognone.com/node/1", "atom + AI filter");

const p = parseArxiv(arxiv);
assert(p.length === 2, "arxiv count");
assert(p[0].arxivId === "2610.17439" && p[0].url === "https://arxiv.org/abs/2610.17439", "arxiv id " + p[0].arxivId);
assert(p[0].title === "Large Language Models Extend Known Research", "title whitespace: " + p[0].title);
assert(p[0].course === "Natural Language Processing" && p[1].course === "Computer Vision", "arxiv course");
assert(p[0].authors.length === 2, "authors");

console.log("all parser tests passed", { news: n.map((x) => [x.category, x.course]), thai: t.length, papers: p.map((x) => x.course) });
