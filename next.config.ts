import type { NextConfig } from "next";

// F1.8 — CSP: 'unsafe-eval' solo en dev (React Refresh lo requiere); en
// producción ningún bundle (d3, recharts, force-graph) usa eval. 'unsafe-inline'
// en script-src sigue siendo necesario para los inline scripts de hidratación de
// Next; migrar a nonces exige renderizado dinámico en todas las rutas (rompe las
// páginas estáticas de auth) — pendiente de decisión, ver AUDITORIA-GLOBAL.md.
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  serverExternalPackages: ["d3", "d3-sankey"],

  compress: true,

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              isDev
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self'",
              "img-src 'self' data: blob: https:",
              [
                "connect-src 'self'",
                "https://*.supabase.co",
                "wss://*.supabase.co",
                "https://api.coingecko.com",
                "https://blockstream.info",
                "https://api.etherscan.io",
                "https://finnhub.io",
                "https://v6.exchangerate-api.com",
                "https://query1.finance.yahoo.com",
                "https://query2.finance.yahoo.com",
                "https://yields.llama.fi",
                "https://api.alternative.me",
                "https://api.stlouisfed.org",
              ].join(" "),
            ].join("; "),
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/docs",
        destination: "/docs.html",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
