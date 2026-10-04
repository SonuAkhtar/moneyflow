import { ImageResponse } from "next/og";
import { siteConfig } from "@/config";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "#f5f1e8",
        color: "#17140f",
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3 }}>
        {siteConfig.name}
      </div>
      <div style={{ fontSize: 40, marginTop: 24, color: "#5d574c" }}>
        Salary, savings, EMIs and spending in one place.
      </div>
      <div
        style={{
          marginTop: 48,
          width: 160,
          height: 12,
          borderRadius: 6,
          background: "#609c00",
        }}
      />
    </div>,
    size,
  );
}
