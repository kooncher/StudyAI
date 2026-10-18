import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "เรดาร์ AI ป.โท",
    short_name: "เรดาร์ AI",
    description: "ข่าวและเปเปอร์ AI ล่าสุด ผูกกับวิชาใน CSAI ของ NIDA",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F4F7",
    theme_color: "#2C55C9",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
