import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LessonView from "@/components/LessonView";
import { LESSONS } from "@/lib/lessons";

export const dynamicParams = false;
export function generateStaticParams() {
  return LESSONS.map((l) => ({ topic: l.topic }));
}

export function generateMetadata({ params }: { params: { topic: string } }): Metadata {
  const l = LESSONS.find((x) => x.topic === params.topic);
  return { title: l ? `บทที่ ${l.no} ${l.title} · เรดาร์ AI ป.โท` : "บทเรียน" };
}

export default function LessonPage({ params }: { params: { topic: string } }) {
  const lesson = LESSONS.find((l) => l.topic === params.topic);
  if (!lesson) notFound();
  return <LessonView lesson={lesson} />;
}
