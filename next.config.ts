import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            // `(self)` is sufficient: <ConsultationVideo /> runs Daily's Call
            // Object mode, so getUserMedia is called from this same-origin
            // document directly rather than from a cross-origin iframe. See
            // the matching comment in src/proxy.ts, which sets this same
            // header identically — both must stay in sync.
            value: "camera=(self), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
