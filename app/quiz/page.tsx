import type { Metadata } from "next";
import Quiz from "@/components/Quiz";

export const metadata: Metadata = { title: "ฝึกโจทย์สถิติ · เรดาร์ AI ป.โท" };

export default function QuizPage() {
  return <Quiz />;
}
