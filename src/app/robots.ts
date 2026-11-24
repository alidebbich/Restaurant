import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.SITE_URL || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/fr", "/ar", "/en", "/fr/menu", "/ar/menu", "/en/menu", "/fr/order", "/ar/order", "/en/order"],
        disallow: ["/admin/", "/api/", "/dev/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
