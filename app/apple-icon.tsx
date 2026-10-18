import { ImageResponse } from "next/og";
import { RadarMark } from "./radar-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// ไอคอนตอนกด "Add to Home Screen" บน iPad / iPhone
export default function AppleIcon() {
  return new ImageResponse(<RadarMark size={180} />, size);
}
