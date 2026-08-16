import type { MetadataRoute } from "next";
import { siteConfig } from "@/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} - ${siteConfig.description}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f1e8",
    theme_color: "#f5f1e8",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/moneyflow-logo.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/moneyflow-logo.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
