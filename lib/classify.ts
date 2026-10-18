import type { Category, Course } from "./types";

// จับคำในหัวข้อ/สรุป แล้วผูกกับวิชาใน CSAI (ไม่ต้องใช้ LLM จึงฟรีและเร็ว)
const COURSE_RULES: [Course, RegExp][] = [
  ["Natural Language Processing", /\b(nlp|language model|llm|text|token|translation|speech|chatbot|retrieval|rag|question answering|thai language|tokeniz)/i],
  ["Computer Vision", /\b(vision|image|video|visual|3d|segmentation|detection|camera|pixel|diffusion transformer|scene)/i],
  ["Generative AI", /\b(generative|genai|diffusion|text-to-|image generation|video generation|synthetic data|prompt)/i],
  ["Deep Learning", /\b(transformer|neural network|deep learning|moe|mixture of experts|attention|pretrain|scaling law|fine-tun|lora|quantiz)/i],
  ["Machine Learning", /\b(reinforcement learning|\brl\b|benchmark|dataset|classification|regression|federated|optimization|bayesian|imitation learning)/i],
  ["Cloud Computing", /\b(gpu|chip|data center|datacenter|cloud|inference cost|serving|nvidia|tpu|compute|aws|azure)/i],
  ["Advanced Database Systems", /\b(database|sql|vector store|vector database|knowledge graph|data warehouse|indexing)/i],
  ["Human-Computer Interaction", /\b(user study|interface|hci|usability|human-ai|assistant app|accessibility|ux)/i],
  ["Research & Ethics", /\b(ethic|regulat|law|policy|safety|alignment|bias|fairness|privacy|copyright|govern|risk|lawsuit|ai act)/i],
  ["Artificial Intelligence", /\b(agent|agentic|planning|reasoning|search|multi-agent|robot)/i],
];

export function classifyCourse(text: string, arxivCat?: string): Course {
  if (arxivCat === "cs.CL") return "Natural Language Processing";
  if (arxivCat === "cs.CV") return "Computer Vision";
  for (const [course, re] of COURSE_RULES) if (re.test(text)) return course;
  if (arxivCat === "cs.LG") return "Machine Learning";
  return "Artificial Intelligence";
}

const CATEGORY_RULES: [Category, RegExp][] = [
  ["policy", /\b(regulat|law\b|laws\b|bill\b|act\b|policy|government|senate|congress|ftc\b|eu\b|commission|court|lawsuit|ministry)|กฎหมาย|นโยบาย|รัฐบาล/i],
  ["safety", /\b(safety|alignment|misuse|incident|deepfake|jailbreak|security|harm)|ความปลอดภัย/i],
  ["business", /\b(funding|raises|valuation|ipo\b|acquire|acquisition|stock|revenue|invest|market|billion|startup|deal)|ลงทุน|หุ้น/i],
  ["research", /\b(research|paper|study|scientist|benchmark|arxiv|dataset|university|lab\b)|วิจัย/i],
];

export function classifyCategory(text: string): Category {
  for (const [cat, re] of CATEGORY_RULES) if (re.test(text)) return cat;
  return "model";
}

const AI_WORDS = /\b(ai|a\.i\.|artificial intelligence|machine learning|llm|gpt|gemini|claude|chatbot|neural|openai|anthropic|deepmind|copilot|generative)\b|ปัญญาประดิษฐ์|เอไอ/i;
export const looksLikeAI = (text: string) => AI_WORDS.test(text);
