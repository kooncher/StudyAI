import type { Metadata } from "next";
import LearnIndex from "@/components/LearnIndex";

export const metadata: Metadata = { title: "บทเรียนสถิติ · เรดาร์ AI ป.โท" };

export default function LearnPage() {
  return <LearnIndex />;
}
