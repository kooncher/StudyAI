import Dashboard from "@/components/Dashboard";
import { loadFeeds } from "@/lib/sources";

// ดึงข้อมูลใหม่จากแหล่งทุก 30 นาที (Incremental Static Regeneration ของ Vercel)
export const revalidate = 1800;

export default async function Page() {
  const data = await loadFeeds();
  const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY);
  return <Dashboard data={data} aiEnabled={aiEnabled} />;
}
