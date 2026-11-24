import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProduction = process.env.NODE_ENV === "production";

const nextConfig = {
  devIndicators: false,
  turbopack: {
    root: path.resolve(process.cwd()),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        ignored: ["**/data/**", "**/.git/**", "**/node_modules/**"],
      };
    }
    return config;
  },
  images: {
    // SVG uploads disabled by default for security (XSS risk)
    // Enable only if absolutely necessary and with proper sanitization
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Allow images from your own domain
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Security: prevent powered-by header
  poweredByHeader: false,
  // Security: enable React strict mode (already default in Next.js 16)
  reactStrictMode: true,
  // Security: ensure proper headers for production
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: [
          // DNS prefetch control
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          // Expect-CT (Certificate Transparency)
          // Only in production with valid CT logs
          ...(isProduction
            ? [
                {
                  key: "Expect-CT",
                  value: "max-age=86400, enforce",
                },
              ]
            : []),
        ],
      },
      {
        // API routes - additional security
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        // Admin routes - additional security
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);