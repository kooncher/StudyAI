// ตัวอย่าง HTML แบบที่ arXiv สร้าง (LaTeXML) ใช้ทดสอบตัวแปลงและดูหน้าตาโดยไม่ต้องต่ออินเทอร์เน็ต
import { parseArxivHtml, type PaperDoc } from "./paper";

export const SAMPLE_HTML = `<!DOCTYPE html><html><body><article class="ltx_document">
<div class="ltx_authors">Zhihua Liu, Kurt Butler</div>
<div class="ltx_abstract"><p class="ltx_p">abstract text in html</p></div>
<section class="ltx_section" id="S1"><h2 class="ltx_title ltx_title_section"><span class="ltx_tag ltx_tag_section">1 </span>Introduction</h2>
<div class="ltx_para"><p class="ltx_p">Large language models are increasingly used to propose research hypotheses. Whether these hypotheses open genuinely new directions, or mostly recombine what is already known, remains an open question with direct consequences for how researchers should use them.</p></div>
<div class="ltx_para"><p class="ltx_p">We study this question at scale by placing human-written papers and model-generated hypotheses in one shared embedding space, where distance can be measured with <math alttext="d(x,y)=1-\\cos(x,y)"><mi>d</mi></math> for any two items.</p></div>
<figure class="ltx_figure"><figcaption>Figure 1: overview</figcaption></figure>
</section>
<section class="ltx_section" id="S2"><h2 class="ltx_title ltx_title_section"><span class="ltx_tag ltx_tag_section">2 </span>Method</h2>
<section class="ltx_subsection"><h3 class="ltx_title ltx_title_subsection"><span class="ltx_tag ltx_tag_subsection">2.1 </span>Orthogonal novelty score</h3>
<div class="ltx_para"><p class="ltx_p">Distance from prior work alone rewards ideas that are merely unusual. We therefore decompose each new idea into a component along the dominant direction of nearby prior work and a component orthogonal to it, and score novelty by the orthogonal part.</p></div>
<div class="ltx_para"><p class="ltx_p">Short.</p></div>
</section>
<table class="ltx_tabular"><tr><td>should be removed</td></tr></table>
</section>
<section class="ltx_bibliography"><p class="ltx_p">[1] Reference that must not appear in the reader at all.</p></section>
</article></body></html>`;

export function mockPaper(id: string): PaperDoc {
  return {
    meta: {
      id: "p-" + id, kind: "paper", arxivId: id, url: `https://arxiv.org/abs/${id}`, primaryCategory: "cs.CL", course: "Natural Language Processing",
      date: "2026-10-12T17:00:00Z", authors: ["Zhihua Liu", "Kurt Butler", "Damian Machlanski"],
      title: "Large Language Models Extend Known Research But Do Not Create New Research Directions",
      summary: "LLM-generated research hypotheses land farther from existing work than human-written papers do, yet they score lower on a measure of whether they open new research directions. We embed 26.9 million human papers and about 524,000 hypotheses from eight models in a shared conceptual space and introduce an orthogonal novelty score that separates distance from prior work from movement in a new direction.",
    },
    sections: [{ title: "Abstract", blocks: [{ kind: "p", text: "LLM-generated research hypotheses land farther from existing work than human-written papers do, yet they score lower on a measure of whether they open new research directions. We embed 26.9 million human papers and about 524,000 hypotheses from eight models in a shared conceptual space and introduce an orthogonal novelty score that separates distance from prior work from movement in a new direction." }] }, ...parseArxivHtml(SAMPLE_HTML)],
    hasFullText: true,
    htmlUrl: `https://arxiv.org/html/${id}`,
  };
}
