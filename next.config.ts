import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // LINE プロフィール画像 CDN
      { protocol: "https", hostname: "profile.line-scdn.net" },
      { protocol: "https", hostname: "sprofile.line-scdn.net" },
      // Supabase Storage（アバターアップロード用）
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
