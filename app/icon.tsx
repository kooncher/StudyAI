import { ImageResponse } from "next/og";
import { RadarMark } from "./radar-mark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<RadarMark size={512} />, size);
}
