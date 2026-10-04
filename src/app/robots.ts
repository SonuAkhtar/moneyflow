import type { MetadataRoute } from "next";
import { env } from "@/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/login", "/signup", "/forgot-password"],
        disallow: ["/"],
      },
    ],
    host: env.appUrl,
  };
}
