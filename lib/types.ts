export type Category = "model" | "research" | "policy" | "business" | "safety";

export type Course =
  | "Artificial Intelligence"
  | "Machine Learning"
  | "Deep Learning"
  | "Generative AI"
  | "Natural Language Processing"
  | "Computer Vision"
  | "Cloud Computing"
  | "Advanced Database Systems"
  | "Human-Computer Interaction"
  | "Research & Ethics";

export type NewsItem = {
  id: string;
  kind: "news";
  title: string;
  summary: string;
  url: string;
  source: string;
  lang: "en" | "th";
  date: string; // ISO
  category: Category;
  course: Course;
};

export type PaperItem = {
  id: string;
  kind: "paper";
  arxivId: string;
  title: string;
  summary: string;
  url: string;
  authors: string[];
  primaryCategory: string;
  date: string; // ISO
  course: Course;
};

export type FeedItem = NewsItem | PaperItem;

export type FeedData = {
  news: NewsItem[];
  papers: PaperItem[];
  fetchedAt: string;
  sources: { name: string; ok: boolean; count: number }[];
};
